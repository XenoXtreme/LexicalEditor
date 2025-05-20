import LexicalEditorComponent from "@/components/lexical-editor/LexicalEditorComponent";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 bg-background text-foreground">
      <div className="w-full mt-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-primary">Lexical Canvas</h1>
        <LexicalEditorComponent />
      </div>
    </main>
  );
}
