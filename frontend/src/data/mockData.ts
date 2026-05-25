import type { Playlist, Video } from '../types/playlist'

const mkThumb = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`

export const playlists: Playlist[] = [
  {
    id: 'PL_mock_system_design',
    title: 'Deep Dive: System Design',
    channelTitle: 'Tech Fundamentals',
    thumbnailUrl: mkThumb('dQw4w9WgXcQ'),
    videoCount: 6,
    description: 'Comprehensive walkthrough of system design concepts including load balancing, caching, database sharding, and microservices architecture.',
    publishedAt: '2025-11-15T10:00:00Z',
  },
  {
    id: 'PL_mock_react19',
    title: 'React 19 Crash Course',
    channelTitle: 'Frontend Masters',
    thumbnailUrl: mkThumb('SqcY0GlETPk'),
    videoCount: 5,
    description: 'Learn everything new in React 19 — server components, actions, use() hook, and the new compiler.',
    publishedAt: '2026-01-20T08:30:00Z',
  },
  {
    id: 'PL_mock_coding_jazz',
    title: 'Ambient Coding Jazz',
    channelTitle: 'Music for Devs',
    thumbnailUrl: mkThumb('5yx6BWlEVcM'),
    videoCount: 4,
    description: 'A curated collection of ambient jazz tracks perfect for late-night coding sessions.',
    publishedAt: '2025-09-01T14:00:00Z',
  },
  {
    id: 'PL_mock_typescript',
    title: 'TypeScript Advanced Patterns',
    channelTitle: 'TypeScript Pro',
    thumbnailUrl: mkThumb('j92fxPBa1O8'),
    videoCount: 8,
    description: 'Master discriminated unions, template literal types, conditional types, mapped types, and infer — with real-world examples.',
    publishedAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'PL_mock_linux_cli',
    title: 'Linux CLI Mastery',
    channelTitle: 'DevOps Daily',
    thumbnailUrl: mkThumb('oxuRbt_k7pI'),
    videoCount: 6,
    description: 'From basic commands to advanced shell scripting — become a command-line power user.',
    publishedAt: '2025-07-22T09:00:00Z',
  },
  {
    id: 'PL_mock_data_structures',
    title: 'Data Structures Explained',
    channelTitle: 'Algo Academy',
    thumbnailUrl: mkThumb('RBSGKlAvoiM'),
    videoCount: 5,
    description: 'Visual explanations of arrays, linked lists, trees, graphs, hash maps, and heaps — with Big O analysis.',
    publishedAt: '2026-02-14T11:00:00Z',
  },
]

const videosMap: Record<string, Video[]> = {
  PL_mock_system_design: [
    { id: 'dQw4w9WgXcQ', title: 'Introduction to System Design', channelTitle: 'Tech Fundamentals', duration: '18:42', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2025-11-15T10:00:00Z', viewCount: 142000 },
    { id: 'SqcY0GlETPk', title: 'Load Balancing Strategies', channelTitle: 'Tech Fundamentals', duration: '24:15', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2025-11-17T10:00:00Z', viewCount: 98000 },
    { id: '5yx6BWlEVcM', title: 'Caching Layers: From Browser to CDN', channelTitle: 'Tech Fundamentals', duration: '31:08', thumbnail: { url: mkThumb('5yx6BWlEVcM'), width: 320, height: 180 }, publishedAt: '2025-11-20T10:00:00Z', viewCount: 87000 },
    { id: 'j92fxPBa1O8', title: 'Database Sharding Deep Dive', channelTitle: 'Tech Fundamentals', duration: '42:33', thumbnail: { url: mkThumb('j92fxPBa1O8'), width: 320, height: 180 }, publishedAt: '2025-11-24T10:00:00Z', viewCount: 115000 },
    { id: 'oxuRbt_k7pI', title: 'Microservices: The Good, The Bad', channelTitle: 'Tech Fundamentals', duration: '36:20', thumbnail: { url: mkThumb('oxuRbt_k7pI'), width: 320, height: 180 }, publishedAt: '2025-11-28T10:00:00Z', viewCount: 93000 },
    { id: 'RBSGKlAvoiM', title: 'System Design Interview Walkthrough', channelTitle: 'Tech Fundamentals', duration: '55:10', thumbnail: { url: mkThumb('RBSGKlAvoiM'), width: 320, height: 180 }, publishedAt: '2025-12-02T10:00:00Z', viewCount: 201000 },
  ],
  PL_mock_react19: [
    { id: 'SqcY0GlETPk', title: 'What\'s New in React 19', channelTitle: 'Frontend Masters', duration: '22:10', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2026-01-20T08:30:00Z', viewCount: 89000 },
    { id: 'dQw4w9WgXcQ', title: 'React Server Components in Practice', channelTitle: 'Frontend Masters', duration: '28:45', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2026-01-22T08:30:00Z', viewCount: 67000 },
    { id: '5yx6BWlEVcM', title: 'Understanding the use() Hook', channelTitle: 'Frontend Masters', duration: '15:33', thumbnail: { url: mkThumb('5yx6BWlEVcM'), width: 320, height: 180 }, publishedAt: '2026-01-25T08:30:00Z', viewCount: 72000 },
    { id: 'j92fxPBa1O8', title: 'Actions and Form Handling', channelTitle: 'Frontend Masters', duration: '19:18', thumbnail: { url: mkThumb('j92fxPBa1O8'), width: 320, height: 180 }, publishedAt: '2026-01-28T08:30:00Z', viewCount: 61000 },
    { id: 'oxuRbt_k7pI', title: 'React Compiler: Write Less, Run Faster', channelTitle: 'Frontend Masters', duration: '26:02', thumbnail: { url: mkThumb('oxuRbt_k7pI'), width: 320, height: 180 }, publishedAt: '2026-02-01T08:30:00Z', viewCount: 95000 },
  ],
  PL_mock_coding_jazz: [
    { id: '5yx6BWlEVcM', title: 'Late Night Lo-Fi Jazz Mix', channelTitle: 'Music for Devs', duration: '1:02:30', thumbnail: { url: mkThumb('5yx6BWlEVcM'), width: 320, height: 180 }, publishedAt: '2025-09-01T14:00:00Z', viewCount: 340000 },
    { id: 'dQw4w9WgXcQ', title: 'Rainy Window Coding Session', channelTitle: 'Music for Devs', duration: '58:15', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2025-09-15T14:00:00Z', viewCount: 210000 },
    { id: 'SqcY0GlETPk', title: 'Smooth Piano for Debugging', channelTitle: 'Music for Devs', duration: '45:00', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2025-10-01T14:00:00Z', viewCount: 185000 },
    { id: 'RBSGKlAvoiM', title: 'Jazzhop Focus Beats', channelTitle: 'Music for Devs', duration: '1:15:42', thumbnail: { url: mkThumb('RBSGKlAvoiM'), width: 320, height: 180 }, publishedAt: '2025-10-15T14:00:00Z', viewCount: 278000 },
  ],
  PL_mock_typescript: [
    { id: 'j92fxPBa1O8', title: 'Discriminated Unions for State Machines', channelTitle: 'TypeScript Pro', duration: '16:40', thumbnail: { url: mkThumb('j92fxPBa1O8'), width: 320, height: 180 }, publishedAt: '2026-03-10T12:00:00Z', viewCount: 45000 },
    { id: 'dQw4w9WgXcQ', title: 'Template Literal Types Unleashed', channelTitle: 'TypeScript Pro', duration: '20:12', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2026-03-13T12:00:00Z', viewCount: 38000 },
    { id: 'SqcY0GlETPk', title: 'Conditional Types: If/Else at the Type Level', channelTitle: 'TypeScript Pro', duration: '24:55', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2026-03-16T12:00:00Z', viewCount: 41000 },
    { id: '5yx6BWlEVcM', title: 'Mapped Types: Transform Your Objects', channelTitle: 'TypeScript Pro', duration: '18:30', thumbnail: { url: mkThumb('5yx6BWlEVcM'), width: 320, height: 180 }, publishedAt: '2026-03-19T12:00:00Z', viewCount: 36000 },
    { id: 'oxuRbt_k7pI', title: 'The infer Keyword — Finally Explained', channelTitle: 'TypeScript Pro', duration: '27:18', thumbnail: { url: mkThumb('oxuRbt_k7pI'), width: 320, height: 180 }, publishedAt: '2026-03-22T12:00:00Z', viewCount: 52000 },
    { id: 'RBSGKlAvoiM', title: 'Branded Types and Opaque Types', channelTitle: 'TypeScript Pro', duration: '14:22', thumbnail: { url: mkThumb('RBSGKlAvoiM'), width: 320, height: 180 }, publishedAt: '2026-03-25T12:00:00Z', viewCount: 33000 },
    { id: 'dQw4w9WgXcQ', title: 'Recursive Types and JSON Schema', channelTitle: 'TypeScript Pro', duration: '22:08', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2026-03-28T12:00:00Z', viewCount: 29000 },
    { id: 'SqcY0GlETPk', title: 'TypeScript Pattern Matching with never', channelTitle: 'TypeScript Pro', duration: '19:45', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2026-04-01T12:00:00Z', viewCount: 44000 },
  ],
  PL_mock_linux_cli: [
    { id: 'oxuRbt_k7pI', title: 'Terminal Basics: Navigation and Files', channelTitle: 'DevOps Daily', duration: '14:20', thumbnail: { url: mkThumb('oxuRbt_k7pI'), width: 320, height: 180 }, publishedAt: '2025-07-22T09:00:00Z', viewCount: 76000 },
    { id: 'dQw4w9WgXcQ', title: 'Pipes, Redirects, and tee', channelTitle: 'DevOps Daily', duration: '17:55', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2025-07-25T09:00:00Z', viewCount: 62000 },
    { id: 'SqcY0GlETPk', title: 'grep, sed, and awk: Text Processing Trio', channelTitle: 'DevOps Daily', duration: '31:40', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2025-07-29T09:00:00Z', viewCount: 89000 },
    { id: '5yx6BWlEVcM', title: 'Shell Scripting: Variables and Control Flow', channelTitle: 'DevOps Daily', duration: '25:12', thumbnail: { url: mkThumb('5yx6BWlEVcM'), width: 320, height: 180 }, publishedAt: '2025-08-02T09:00:00Z', viewCount: 54000 },
    { id: 'j92fxPBa1O8', title: 'cron, systemd, and Process Management', channelTitle: 'DevOps Daily', duration: '28:30', thumbnail: { url: mkThumb('j92fxPBa1O8'), width: 320, height: 180 }, publishedAt: '2025-08-06T09:00:00Z', viewCount: 48000 },
    { id: 'RBSGKlAvoiM', title: 'tmux and vim: Power User Setup', channelTitle: 'DevOps Daily', duration: '35:18', thumbnail: { url: mkThumb('RBSGKlAvoiM'), width: 320, height: 180 }, publishedAt: '2025-08-10T09:00:00Z', viewCount: 71000 },
  ],
  PL_mock_data_structures: [
    { id: 'RBSGKlAvoiM', title: 'Arrays and Dynamic Arrays', channelTitle: 'Algo Academy', duration: '16:30', thumbnail: { url: mkThumb('RBSGKlAvoiM'), width: 320, height: 180 }, publishedAt: '2026-02-14T11:00:00Z', viewCount: 58000 },
    { id: 'dQw4w9WgXcQ', title: 'Linked Lists: Singly, Doubly, Circular', channelTitle: 'Algo Academy', duration: '22:15', thumbnail: { url: mkThumb('dQw4w9WgXcQ'), width: 320, height: 180 }, publishedAt: '2026-02-17T11:00:00Z', viewCount: 49000 },
    { id: 'SqcY0GlETPk', title: 'Hash Maps: How They Really Work', channelTitle: 'Algo Academy', duration: '19:48', thumbnail: { url: mkThumb('SqcY0GlETPk'), width: 320, height: 180 }, publishedAt: '2026-02-20T11:00:00Z', viewCount: 63000 },
    { id: '5yx6BWlEVcM', title: 'Binary Trees and Traversals', channelTitle: 'Algo Academy', duration: '26:05', thumbnail: { url: mkThumb('5yx6BWlEVcM'), width: 320, height: 180 }, publishedAt: '2026-02-24T11:00:00Z', viewCount: 51000 },
    { id: 'j92fxPBa1O8', title: 'Graphs: BFS, DFS, and Dijkstra', channelTitle: 'Algo Academy', duration: '34:22', thumbnail: { url: mkThumb('j92fxPBa1O8'), width: 320, height: 180 }, publishedAt: '2026-02-28T11:00:00Z', viewCount: 72000 },
  ],
}

export function getVideosForPlaylist(playlistId: string): Video[] {
  return videosMap[playlistId] ?? []
}
