// Shared status vocabulary for app rows and app detail pages — kept in one
// place so the label/color mapping can't drift between AppsList and
// AppPageHeader.
export const statusLabel = {
  live: 'Live',
  dev: 'In Dev',
  planning: 'In Planning',
} as const;

export type AppStatus = keyof typeof statusLabel;
