export type User = { id:number; name:string; email:string; role:string; picture?:string | null };
export type Source = { type:string; title:string; id:number; snippet:string; version?:string | null; owner?:string | null; last_verified_date?:string | null; href?:string | null; download_url?:string | null; filename?:string | null };
export type ChatMessage = { id?:number; role:'user'|'assistant'; content:string; sources?:Source[]; knowledge_gap?:boolean; generated_by?:string; rating?:'UP'|'DOWN'|string };
export type Automation = { id:number; name:string; short_description:string; business_function?:string; capabilities?:string; owner?:string; technology?:string; status:string; last_reviewed_date?:string };
export type DocumentItem = { id:number; title:string; description?:string; category?:string; owner?:string; status:string; version:string; last_verified_date?:string; confidentiality_level:string };
export type DocumentDetail = DocumentItem & { document_type?:string; source_location?:string; extracted_text?:string; created_at?:string; updated_at?:string };
