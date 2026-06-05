export const LLM_ENGINES = [
  {
    id: 'Claude-Code',
    name: 'Claude-Code',
    provider: 'Anthropic',
    speed: 'Moderate',
    contextWindow: '200k',
    costPerMillion: 15.00,
    description: 'State-of-the-art coding and architectural reasoning. Best for complex debugging and writing multi-file systems.',
    descriptionTH: 'การเขียนโค้ดและคิดเหตุผลเชิงสถาปัตยกรรมระดับสูงสุด เหมาะสำหรับงานดีบั๊กซับซ้อนและการเขียนระบบหลายไฟล์',
    color: '#D97706', // Amber-600
    glowColor: 'rgba(217, 119, 6, 0.4)'
  },
  {
    id: 'Gemini-CLI',
    name: 'Gemini-CLI',
    provider: 'Google',
    speed: 'Blazing Fast',
    contextWindow: '2,000k',
    costPerMillion: 1.25,
    description: 'Enormous context capacity. Excels in rapid planning, codebase ingestion, and complex multimodal tasks.',
    descriptionTH: 'รองรับข้อมูลขนาดยักษ์ โดดเด่นด้านการวางแผนด่วน การอ่านทำความเข้าใจโค้ดดึงข้อมูลขนาดใหญ่ และงานมัลติโมดอล',
    color: '#2563EB', // Blue-600
    glowColor: 'rgba(37, 99, 235, 0.4)'
  },
  {
    id: 'Codex',
    name: 'Codex',
    provider: 'OpenAI',
    speed: 'Fast',
    contextWindow: '128k',
    costPerMillion: 5.00,
    description: 'Classic command synthesis and automation. Excellent syntax comprehension and code generation speed.',
    descriptionTH: 'การสังเคราะห์คำสั่งและระบบอัตโนมัติคลาสสิก เข้าใจไวยากรณ์โค้ดและการสร้างโปรแกรมได้อย่างรวดเร็วและแม่นยำ',
    color: '#059669', // Emerald-600
    glowColor: 'rgba(5, 150, 105, 0.4)'
  },
  {
    id: 'Qwen-CLI',
    name: 'Qwen-CLI',
    provider: 'Alibaba',
    speed: 'Very Fast',
    contextWindow: '128k',
    costPerMillion: 0.80,
    description: 'Outstanding multilingual support. Exceptional performance in Asian languages, scripting, and shell execution.',
    descriptionTH: 'รองรับการประมวลผลหลายภาษายอดเยี่ยม มีประสิทธิภาพโดดเด่นในภาษาเอเชีย งานเขียนสคริปต์ และการรัน Shell',
    color: '#7C3AED', // Violet-600
    glowColor: 'rgba(124, 58, 237, 0.4)'
  },
  {
    id: 'DeepSeek-Agent',
    name: 'DeepSeek-Agent',
    provider: 'DeepSeek',
    speed: 'Moderate',
    contextWindow: '64k',
    costPerMillion: 0.14,
    description: 'Ultra-low cost high-performance logical math coding. Great for scripting optimization and automated systems.',
    descriptionTH: 'โค้ดตรรกะคณิตศาสตร์ประสิทธิภาพสูงในราคาประหยัดที่สุด เหมาะสำหรับการเพิ่มประสิทธิภาพสคริปต์และระบบอัตโนมัติ',
    color: '#0891B2', // Cyan-600
    glowColor: 'rgba(8, 145, 178, 0.4)'
  }
];

export const CLI_MODEL_OPTIONS = {
  Codex: [
    { id: '', name: 'Default from Codex config' },
    { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'o3', name: 'o3' }
  ],
  'Gemini-CLI': [
    { id: 'auto', name: 'Auto' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B A4B IT' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
  ],
  'Claude-Code': [
    { id: '', name: 'Default from Claude config' },
    { id: 'sonnet', name: 'Claude Sonnet' },
    { id: 'opus', name: 'Claude Opus' },
    { id: 'haiku', name: 'Claude Haiku' }
  ],
  'Qwen-CLI': [
    { id: '', name: 'Default from Qwen config' },
    { id: 'qwen-max', name: 'Qwen Max' },
    { id: 'qwen-plus', name: 'Qwen Plus' },
    { id: 'qwen-turbo', name: 'Qwen Turbo' },
    { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B' }
  ]
};

export function getDefaultCliModel(engineId) {
  return CLI_MODEL_OPTIONS[engineId]?.[0]?.id || '';
}

export const AGENT_FRAMEWORKS = [
  {
    id: 'thclaws',
    name: 'thclaws',
    type: 'Bilingual Specialist',
    autonomyRating: 94,
    primaryUse: 'Advanced Thai-localized scripting, parsing multi-step workflows, and network command translation.',
    primaryUseTH: 'การเขียนสคริปต์แบบระบุเจาะจงท้องถิ่นไทย การแกะแยกเวิร์กโฟลว์หลายขั้นตอน และการแปลคำสั่งระบบเครือข่าย',
    color: '#DC2626', // Red-600
    glowColor: 'rgba(220, 38, 38, 0.4)'
  },
  {
    id: 'Hermes',
    name: 'Hermes',
    type: 'Task Router',
    autonomyRating: 88,
    primaryUse: 'Multi-turn interactive planning, structured sub-task scheduling, and user approval safety checks.',
    primaryUseTH: 'การวางแผนเชิงตอบโต้แบบหลายรอบ จัดกำหนดการแผนงานย่อยที่มีโครงสร้าง และการตรวจสอบความปลอดภัยด้วยสิทธิ์ผู้ใช้',
    color: '#4B5563', // Gray-600
    glowColor: 'rgba(75, 85, 99, 0.4)'
  },
  {
    id: 'Openclaw',
    name: 'Openclaw',
    type: 'Autonomous Executor',
    autonomyRating: 96,
    primaryUse: 'Strict tool calling loops, recursive directory writing, self-debugging compiler errors, and local git tasks.',
    primaryUseTH: 'ลูปเรียกใช้ Tool เข้มงวด เขียนไฟล์โฟลเดอร์แบบเรียกซ้ำ ดีบั๊กแก้ไขข้อผิดพลาดคอมไพเลอร์เอง และงาน Git ท้องถิ่น',
    color: '#10B981', // Emerald-500
    glowColor: 'rgba(16, 185, 129, 0.4)'
  },
  {
    id: 'Gemini Spark',
    name: 'Gemini Spark',
    type: 'Multimodal Planner',
    autonomyRating: 92,
    primaryUse: 'Exploratory vector search mapping, quick directory scaffolding, and parsing raw file blobs dynamically.',
    primaryUseTH: 'การค้นหาแมปปิ้งความสัมพันธ์ของเวกเตอร์ สร้างโครงสร้างไดเรกทอรีด่วน และแยกเนื้อหาของไฟล์ข้อมูลดิบอย่างยืดหยุ่น',
    color: '#3B82F6', // Blue-500
    glowColor: 'rgba(59, 130, 246, 0.4)'
  },
  {
    id: 'Claude Cowork',
    name: 'Claude Cowork',
    type: 'Collaborative Coder',
    autonomyRating: 90,
    primaryUse: 'Pair programming code reviews, automated unit testing runs, documentation compilation, and pull requests.',
    primaryUseTH: 'การรีวิวโค้ดแบบบับเบิ้ลคู่ รันการทดสอบ Unit Test อัตโนมัติ รวบรวมเอกสารคู่มือระบบ และทำ Pull Requests',
    color: '#F59E0B', // Amber-500
    glowColor: 'rgba(245, 158, 11, 0.4)'
  }
];

export const WARP_THEMES = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    bg: '#0c0714',
    cardBg: 'rgba(24, 15, 38, 0.65)',
    borderColor: '#bd00ff',
    glowColor: '0 0 12px rgba(189, 0, 255, 0.45)',
    textColor: '#00f0ff',
    accentColor: '#00ff66'
  },
  {
    id: 'deep-space',
    name: 'Deep Space Blue',
    bg: '#050a14',
    cardBg: 'rgba(10, 20, 40, 0.7)',
    borderColor: '#38bdf8',
    glowColor: '0 0 12px rgba(56, 189, 248, 0.45)',
    textColor: '#e0f2fe',
    accentColor: '#38bdf8'
  },
  {
    id: 'amber-matrix',
    name: 'Amber Matrix',
    bg: '#050705',
    cardBg: 'rgba(8, 20, 8, 0.75)',
    borderColor: '#00ff66',
    glowColor: '0 0 10px rgba(0, 255, 102, 0.35)',
    textColor: '#00ff66',
    accentColor: '#f59e0b'
  },
  {
    id: 'orchid-glass',
    name: 'Orchid Glass',
    bg: '#0d0c10',
    cardBg: 'rgba(30, 20, 35, 0.7)',
    borderColor: '#f43f5e',
    glowColor: '0 0 12px rgba(244, 63, 94, 0.45)',
    textColor: '#ffe4e6',
    accentColor: '#ec4899'
  }
];

export const PRESET_GOALS = [
  {
    id: 'goal-mkdir',
    title: 'สร้างโฟลเดอร์และโครงสร้างงาน',
    titleEN: 'Create folder & workspace structure',
    prompt: 'สร้างโฟลเดอร์ชื่อ my-athena-app แล้วลองย้ายตำแหน่งการทำงานเข้าไปในนั้น เพื่อดึงข้อมูลสถานะโฟลเดอร์'
  },
  {
    id: 'goal-file',
    title: 'สร้างไฟล์ทดสอบระบบและเขียนข้อมูล',
    titleEN: 'Create testing file and write greeting',
    prompt: 'เขียนสร้างไฟล์ทดสอบชื่อ app-test.log ที่มีข้อมูลระบบของ Aetheris และลองแสดงข้อมูลในไฟล์นั้นทางจอภาพ'
  },
  {
    id: 'goal-net',
    title: 'ตรวจสอบการเชื่อมต่อเครือข่ายและ IP',
    titleEN: 'Verify network connectivity and IPs',
    prompt: 'ตรวจสอบ Network configuration ของเครื่องนี้ (ipconfig) พร้อมทดสอบการ Ping ไปยังอินเทอร์เน็ตภายนอก'
  },
  {
    id: 'goal-sys',
    title: 'ดึงข้อมูลคุณสมบัติเครื่องและทราฟฟิก CPU',
    titleEN: 'Query PC details & CPU utilization',
    prompt: 'ดึงสเปคเครื่องคอมพิวเตอร์ปัจจุบัน (OS Name) และแสดงโปรเซสที่ใช้หน่วยประมวลผล CPU สูงสุดมาให้ตรวจสอบ'
  }
];
