import type { Playlist, Video } from '../types/playlist'

const mkThumb = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`

export const playlists: Playlist[] = [
  {
    id: 1,
    youtubePlaylistId: 'PL_mock_system_design',
    title: 'Deep Dive: System Design',
    channelTitle: 'Tech Fundamentals',
    thumbnailUrl: mkThumb('dQw4w9WgXcQ'),
    videoCount: 6,
    description: 'Comprehensive walkthrough of system design concepts including load balancing, caching, database sharding, and microservices architecture.',
    publishedAt: '2025-11-15T10:00:00Z',
    sourceType: 'url',
    isHidden: false,
    isUnlinked: false,
    createdAt: '2025-11-15T10:00:00Z',
  },
  {
    id: 2,
    youtubePlaylistId: 'PL_mock_react19',
    title: 'React 19 Crash Course',
    channelTitle: 'Frontend Masters',
    thumbnailUrl: mkThumb('SqcY0GlETPk'),
    videoCount: 5,
    description: 'Learn everything new in React 19 — server components, actions, use() hook, and the new compiler.',
    publishedAt: '2026-01-20T08:30:00Z',
    sourceType: 'url',
    isHidden: false,
    isUnlinked: false,
    createdAt: '2026-01-20T08:30:00Z',
  },
  {
    id: 3,
    youtubePlaylistId: 'PL_mock_coding_jazz',
    title: 'Ambient Coding Jazz',
    channelTitle: 'Music for Devs',
    thumbnailUrl: mkThumb('5yx6BWlEVcM'),
    videoCount: 4,
    description: 'A curated collection of ambient jazz tracks perfect for late-night coding sessions.',
    publishedAt: '2025-09-01T14:00:00Z',
    sourceType: 'url',
    isHidden: false,
    isUnlinked: false,
    createdAt: '2025-09-01T14:00:00Z',
  },
  {
    id: 4,
    youtubePlaylistId: 'PL_mock_typescript',
    title: 'TypeScript Advanced Patterns',
    channelTitle: 'TypeScript Pro',
    thumbnailUrl: mkThumb('j92fxPBa1O8'),
    videoCount: 8,
    description: 'Master discriminated unions, template literal types, conditional types, mapped types, and infer — with real-world examples.',
    publishedAt: '2026-03-10T12:00:00Z',
    sourceType: 'url',
    isHidden: false,
    isUnlinked: false,
    createdAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 5,
    youtubePlaylistId: 'PL_mock_linux_cli',
    title: 'Linux CLI Mastery',
    channelTitle: 'DevOps Daily',
    thumbnailUrl: mkThumb('oxuRbt_k7pI'),
    videoCount: 6,
    description: 'From basic commands to advanced shell scripting — become a command-line power user.',
    publishedAt: '2025-07-22T09:00:00Z',
    sourceType: 'url',
    isHidden: false,
    isUnlinked: false,
    createdAt: '2025-07-22T09:00:00Z',
  },
  {
    id: 6,
    youtubePlaylistId: 'PL_mock_data_structures',
    title: 'Data Structures Explained',
    channelTitle: 'Algo Academy',
    thumbnailUrl: mkThumb('RBSGKlAvoiM'),
    videoCount: 5,
    description: 'Visual explanations of arrays, linked lists, trees, graphs, hash maps, and heaps — with Big O analysis.',
    publishedAt: '2026-02-14T11:00:00Z',
    sourceType: 'url',
    isHidden: false,
    isUnlinked: false,
    createdAt: '2026-02-14T11:00:00Z',
  },
]

let nextVideoId = 101

function v(videoYoutubeId: string, title: string, channelTitle: string, duration: string, publishedAt: string, viewCount: number, position: number): Video {
  const id = nextVideoId++
  return {
    id,
    youtubeVideoId: videoYoutubeId,
    title,
    channelTitle,
    duration,
    thumbnail: { url: mkThumb(videoYoutubeId), width: 320, height: 180 },
    publishedAt,
    viewCount,
    position,
    isRemoved: false,
  }
}

const videosMap: Record<string, Video[]> = {
  PL_mock_system_design: [
    v('dQw4w9WgXcQ', 'Introduction to System Design', 'Tech Fundamentals', '18:42', '2025-11-15T10:00:00Z', 142000, 0),
    v('SqcY0GlETPk', 'Load Balancing Strategies', 'Tech Fundamentals', '24:15', '2025-11-17T10:00:00Z', 98000, 1),
    v('5yx6BWlEVcM', 'Caching Layers: From Browser to CDN', 'Tech Fundamentals', '31:08', '2025-11-20T10:00:00Z', 87000, 2),
    v('j92fxPBa1O8', 'Database Sharding Deep Dive', 'Tech Fundamentals', '42:33', '2025-11-24T10:00:00Z', 115000, 3),
    v('oxuRbt_k7pI', 'Microservices: The Good, The Bad', 'Tech Fundamentals', '36:20', '2025-11-28T10:00:00Z', 93000, 4),
    v('RBSGKlAvoiM', 'System Design Interview Walkthrough', 'Tech Fundamentals', '55:10', '2025-12-02T10:00:00Z', 201000, 5),
  ],
  PL_mock_react19: [
    v('SqcY0GlETPk', 'What\'s New in React 19', 'Frontend Masters', '22:10', '2026-01-20T08:30:00Z', 89000, 0),
    v('dQw4w9WgXcQ', 'React Server Components in Practice', 'Frontend Masters', '28:45', '2026-01-22T08:30:00Z', 67000, 1),
    v('5yx6BWlEVcM', 'Understanding the use() Hook', 'Frontend Masters', '15:33', '2026-01-25T08:30:00Z', 72000, 2),
    v('j92fxPBa1O8', 'Actions and Form Handling', 'Frontend Masters', '19:18', '2026-01-28T08:30:00Z', 61000, 3),
    v('oxuRbt_k7pI', 'React Compiler: Write Less, Run Faster', 'Frontend Masters', '26:02', '2026-02-01T08:30:00Z', 95000, 4),
  ],
  PL_mock_coding_jazz: [
    v('5yx6BWlEVcM', 'Late Night Lo-Fi Jazz Mix', 'Music for Devs', '1:02:30', '2025-09-01T14:00:00Z', 340000, 0),
    v('dQw4w9WgXcQ', 'Rainy Window Coding Session', 'Music for Devs', '58:15', '2025-09-15T14:00:00Z', 210000, 1),
    v('SqcY0GlETPk', 'Smooth Piano for Debugging', 'Music for Devs', '45:00', '2025-10-01T14:00:00Z', 185000, 2),
    v('RBSGKlAvoiM', 'Jazzhop Focus Beats', 'Music for Devs', '1:15:42', '2025-10-15T14:00:00Z', 278000, 3),
  ],
  PL_mock_typescript: [
    v('j92fxPBa1O8', 'Discriminated Unions for State Machines', 'TypeScript Pro', '16:40', '2026-03-10T12:00:00Z', 45000, 0),
    v('dQw4w9WgXcQ', 'Template Literal Types Unleashed', 'TypeScript Pro', '20:12', '2026-03-13T12:00:00Z', 38000, 1),
    v('SqcY0GlETPk', 'Conditional Types: If/Else at the Type Level', 'TypeScript Pro', '24:55', '2026-03-16T12:00:00Z', 41000, 2),
    v('5yx6BWlEVcM', 'Mapped Types: Transform Your Objects', 'TypeScript Pro', '18:30', '2026-03-19T12:00:00Z', 36000, 3),
    v('oxuRbt_k7pI', 'The infer Keyword — Finally Explained', 'TypeScript Pro', '27:18', '2026-03-22T12:00:00Z', 52000, 4),
    v('RBSGKlAvoiM', 'Branded Types and Opaque Types', 'TypeScript Pro', '14:22', '2026-03-25T12:00:00Z', 33000, 5),
    v('dQw4w9WgXcQ', 'Recursive Types and JSON Schema', 'TypeScript Pro', '22:08', '2026-03-28T12:00:00Z', 29000, 6),
    v('SqcY0GlETPk', 'TypeScript Pattern Matching with never', 'TypeScript Pro', '19:45', '2026-04-01T12:00:00Z', 44000, 7),
  ],
  PL_mock_linux_cli: [
    v('oxuRbt_k7pI', 'Terminal Basics: Navigation and Files', 'DevOps Daily', '14:20', '2025-07-22T09:00:00Z', 76000, 0),
    v('dQw4w9WgXcQ', 'Pipes, Redirects, and tee', 'DevOps Daily', '17:55', '2025-07-25T09:00:00Z', 62000, 1),
    v('SqcY0GlETPk', 'grep, sed, and awk: Text Processing Trio', 'DevOps Daily', '31:40', '2025-07-29T09:00:00Z', 89000, 2),
    v('5yx6BWlEVcM', 'Shell Scripting: Variables and Control Flow', 'DevOps Daily', '25:12', '2025-08-02T09:00:00Z', 54000, 3),
    v('j92fxPBa1O8', 'cron, systemd, and Process Management', 'DevOps Daily', '28:30', '2025-08-06T09:00:00Z', 48000, 4),
    v('RBSGKlAvoiM', 'tmux and vim: Power User Setup', 'DevOps Daily', '35:18', '2025-08-10T09:00:00Z', 71000, 5),
  ],
  PL_mock_data_structures: [
    v('RBSGKlAvoiM', 'Arrays and Dynamic Arrays', 'Algo Academy', '16:30', '2026-02-14T11:00:00Z', 58000, 0),
    v('dQw4w9WgXcQ', 'Linked Lists: Singly, Doubly, Circular', 'Algo Academy', '22:15', '2026-02-17T11:00:00Z', 49000, 1),
    v('SqcY0GlETPk', 'Hash Maps: How They Really Work', 'Algo Academy', '19:48', '2026-02-20T11:00:00Z', 63000, 2),
    v('5yx6BWlEVcM', 'Binary Trees and Traversals', 'Algo Academy', '26:05', '2026-02-24T11:00:00Z', 51000, 3),
    v('j92fxPBa1O8', 'Graphs: BFS, DFS, and Dijkstra', 'Algo Academy', '34:22', '2026-02-28T11:00:00Z', 72000, 4),
  ],
}

export function getVideosForPlaylist(youtubePlaylistId: string): Video[] {
  return videosMap[youtubePlaylistId] ?? []
}
