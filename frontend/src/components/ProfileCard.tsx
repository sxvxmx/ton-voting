import type { TelegramUser } from '../types';

type Props = {
  user: TelegramUser | null;
  walletAddress: string;
};

function shortAddress(address: string): string {
  if (!address) {
    return 'Not connected';
  }
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function ProfileCard({ user, walletAddress }: Props) {
  const displayName = user?.username || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User disabled';

  return (
    <section className="card profile-card">
      <div className="profile-row">
        {user?.photo_url ? <img src={user.photo_url} alt={displayName} className="avatar" /> : <div className="avatar-fallback">OFF</div>}
        <div>
          <h2>{displayName}</h2>
          <p className="muted">Telegram profile disabled for performance test</p>
        </div>
      </div>
      <p className="wallet-line">Wallet: {shortAddress(walletAddress)}</p>
    </section>
  );
}
