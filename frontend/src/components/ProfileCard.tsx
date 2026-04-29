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
  const displayName = user?.username || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Telegram User';
  const hintText = user?.id
    ? `@${user.username ?? 'no_username'}`
    : 'Profile unavailable for this launch mode';

  return (
    <section className="card profile-card">
      <div className="profile-row">
        {user?.photo_url ? (
          <img src={user.photo_url} alt={displayName} className="avatar" loading="lazy" decoding="async" />
        ) : (
          <div className="avatar-fallback">TG</div>
        )}
        <div>
          <h2>{displayName}</h2>
          <p className="muted">{hintText}</p>
        </div>
      </div>
      <p className="wallet-line">Wallet: {shortAddress(walletAddress)}</p>
    </section>
  );
}
