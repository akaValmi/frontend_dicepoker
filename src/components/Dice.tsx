import { motion } from "framer-motion";
import Image from "next/image";

interface DiceProps {
  value: number;
  kept: boolean;
  onClick: () => void;
  animate: boolean;
  isActivePlayer: boolean;
}

const Dice: React.FC<DiceProps> = ({
  value,
  kept,
  onClick,
  animate,
  isActivePlayer,
}) => {
  return (
    <motion.div
      className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg mx-2 sm:mx-3 md:mx-4 my-2 transition-transform ${
        kept && isActivePlayer
          ? "border-4 border-amber-300 bg-amber-50 shadow-amber-400/50"
          : "border-2 border-amber-200/60"
      } bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200 shadow-lg`}
      onClick={onClick}
      initial={{ opacity: 0, y: -60 }} // Estado inicial
      animate={{
        opacity: 1,
        y: 0,
        rotate: animate ? [0, 540, 360] : 0,
        scale: animate ? [1, 1.35, 0.95, 1.1, 1] : 1,
      }}
      transition={{
        duration: animate ? 1.4 : 0.6,
        delay: animate ? 0.05 : 0.15,
        ease: "easeInOut",
      }}
      whileHover={{
        boxShadow: "0 0 15px rgba(0, 255, 255, 0.8)",
      }}
      whileTap={{ scale: 0.88 }}
    >
      <Image
        src={`/dice-${value}.svg`}
        alt={`Dice ${value}`}
        width={64}
        height={64}
        className="pointer-events-none w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14"
      />
    </motion.div>
  );
};

export default Dice;
