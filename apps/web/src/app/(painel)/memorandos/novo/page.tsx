import { Suspense } from "react";
import { Loading } from "@neeko/ui";
import { EditorMemorando } from "@/features/memorandos/EditorMemorando";
export default function Novo() { return <Suspense fallback={<Loading />}><EditorMemorando /></Suspense>; }
