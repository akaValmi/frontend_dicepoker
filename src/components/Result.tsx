interface ResultProps {
  result: string;
}

const Result: React.FC<ResultProps> = ({ result }) => {
  return (
    <div className="result mt-4 text-xl text-amber-200 medieval-title">
      {result}
    </div>
  );
};

export default Result;
