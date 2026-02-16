interface RollButtonProps {
  onClick: () => void;
  text: string;
  disabled?: boolean;
}

const RollButton: React.FC<RollButtonProps> = ({
  onClick,
  text,
  disabled = false,
}) => {
  return (
    <button
      className="medieval-button font-bold py-2 px-5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default RollButton;
