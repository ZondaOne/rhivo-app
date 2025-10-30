// Small list of profile image URLs extracted from tenant YAML configs.
// These are used only for demo/social-proof avatars in the landing hero.
export const SEED_AVATARS = [
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1647140655214-e4a2d914971f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1596728325488-58c87691e9af?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=400&fit=crop',
];

export function pickRandomAvatars(count = 4): string[] {
  const copy = [...SEED_AVATARS];
  const results: string[] = [];
  while (results.length < Math.min(count, copy.length)) {
    const idx = Math.floor(Math.random() * copy.length);
    results.push(copy.splice(idx, 1)[0]);
  }
  return results;
}
