export default function Envelope({ number, status, onClick }) {
  const claimed = status === 'claimed';

  return (
    <div
      onClick={() => !claimed && onClick(number)}
      className={`
        relative cursor-pointer select-none
        w-16 h-12 rounded-md flex items-center justify-center
        text-sm font-bold transition-all duration-300
        ${claimed
          ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
          : 'bg-yellow-400 hover:bg-yellow-300 hover:scale-110 hover:shadow-lg active:scale-95'
        }
      `}
    >
      {claimed ? '🔒' : `#${number}`}
    </div>
  );
}
