import type { PageBlockDraft } from "./types";

export function reorderBlocks(
  blocks: PageBlockDraft[],
  activeId: string,
  newPosition: PageBlockDraft["position"],
): PageBlockDraft[] {
  // 1. Create a working copy
  let layout = blocks.map((b) => (b.id === activeId ? { ...b, position: newPosition } : b));

  // 2. Identify the active block (the one being dragged)
  const activeBlock = layout.find((b) => b.id === activeId);
  if (!activeBlock) return blocks;

  // 3. Resolve collisions iteratively involved with the active block
  // We only push blocks DOWN.
  let loops = 0;
  let hasCollisions = true;

  while (hasCollisions && loops < 100) {
    hasCollisions = false;
    loops++;

    // Sort by Y then X to process top-down
    layout.sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

    for (let i = 0; i < layout.length; i++) {
      const blockA = layout[i];
      for (let j = 0; j < layout.length; j++) {
        if (i === j) continue;
        const blockB = layout[j];

        if (isOverlapping(blockA.position, blockB.position)) {
          hasCollisions = true;

          // Push the lower one down. If same Y, push the one processed second (arbitrary but consistent)
          // Ideally we push the one that is NOT the active block, if possible.
          // But if both are not active, we push the lower one.
          
          let blockToMove: typeof blockB;
          let stationaryBlock: typeof blockA;

          // Priority: Active block stays put (it's being held by user). The other moves.
          if (blockA.id === activeId) {
            stationaryBlock = blockA;
            blockToMove = blockB;
          } else if (blockB.id === activeId) {
            stationaryBlock = blockB;
            blockToMove = blockA;
          } else {
             // Neither is active. Push the one that is logically "lower" or same row but later?
             // Simple rule: Push the one with higher index in our sorted array (which means lower/right)
             // or simply: if A overlaps B, and we are iterating, we just need to resolve ONE collision pair.
             
             // Let's decide based on Y.
             if (blockA.position.y < blockB.position.y) {
                stationaryBlock = blockA;
                blockToMove = blockB;
             } else {
                stationaryBlock = blockB;
                blockToMove = blockA;
             }
          }

          // Move blockToMove down until it clears stationaryBlock
          // The minimum Y it needs is stationaryBlock.y + stationaryBlock.height
          const requiredY = stationaryBlock.position.y + stationaryBlock.position.height;
           
          // If it's already below (but overlapping x/width), this logic still holds.
          // Wait, isOverlapping checks full rect.
          
          // Actually, we should just move it down by 1 row and let the next loop iteration check again?
          // Or move it effectively to clear? Moving to clear is more efficient.
          
          if (blockToMove.position.y < requiredY) {
               blockToMove.position.y = requiredY;
          }
        }
      }
    }
  }

  return layout;
}

function isOverlapping(
  a: PageBlockDraft["position"],
  b: PageBlockDraft["position"],
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
