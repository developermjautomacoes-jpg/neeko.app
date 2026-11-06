"use client";
import { use } from "react";
import { EditorMemorando } from "@/features/memorandos/EditorMemorando";
export default function Editar({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <EditorMemorando id={id} />; }
