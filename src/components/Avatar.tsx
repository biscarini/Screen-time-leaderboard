const TINTS = [
  "#4B5D8A", "#8A5B4B", "#4B7A6B", "#6B5B8A",
  "#8A7A4B", "#4B7A8A", "#7A4B6B", "#5B7A4B",
];

function tint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "?";
}

export function Avatar({
  profile,
  size = 34,
}: {
  profile: { id: string; display_name: string; avatar_url: string | null };
  size?: number;
}) {
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="rounded-full grid place-items-center shrink-0 font-display font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: tint(profile.id),
        fontSize: Math.round(size * 0.38),
      }}
    >
      {initials(profile.display_name)}
    </span>
  );
}
