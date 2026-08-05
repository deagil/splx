export default function ContentSection() {
  return (
    <section id="overview">
      <div className="py-24">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mx-auto max-w-2xl">
            <div>
              <span className="text-3xl">🚀</span>
              <h2 className="mt-4 font-semibold text-4xl text-foreground">
                Launch pages that stay connected to your data
              </h2>
              <p className="mt-4 mb-12 text-muted-foreground text-xl">
                Suplex pairs an AI-native builder with structured data mentions,
                so you can design once, keep content accurate, and ship updates
                without waiting on engineering.
              </p>
            </div>

            <div className="relative mt-12 overflow-hidden rounded-3xl bg-black/10 md:mt-16">
              <img
                alt="Founders collaborating over product plans"
                className="absolute inset-0 size-full object-cover"
                src="https://images.unsplash.com/photo-1533119408463-b0f487583ff6?q=80&w=2960&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              />

              <div className="relative m-4 overflow-hidden rounded-(--radius) border border-transparent bg-background shadow-black/15 shadow-xl ring-1 ring-black/10 sm:m-8 md:m-12">
                <div className="relative aspect-video w-full overflow-hidden">
                  <video
                    autoPlay
                    className="size-full object-contain"
                    loop
                    muted
                    playsInline
                    src="/videos/page-editor.mp4"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
