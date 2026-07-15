import Envelope from './Envelope';

export default function VaultGrid({ envelopes, onClaim }) {
  return (
    <div className="grid grid-cols-10 gap-3 p-4">
      {envelopes.map((env) => (
        <Envelope
          key={env.envelope_number}
          number={env.envelope_number}
          status={env.status}
          onClick={onClaim}
        />
      ))}
    </div>
  );
}
