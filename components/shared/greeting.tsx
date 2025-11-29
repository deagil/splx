import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <motion.div
      className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-4 md:px-8"
      key="overview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      >
        Hello there!
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      >
        How can I help you today?
      </motion.div>
    </motion.div>
  );
};
