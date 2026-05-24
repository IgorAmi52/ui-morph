import { createContext, useContext, type RefObject } from 'react';

const EditorContainerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function EditorContainerProvider({
  containerRef,
  children,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <EditorContainerContext.Provider value={containerRef}>
      {children}
    </EditorContainerContext.Provider>
  );
}

export function useEditorContainer(): RefObject<HTMLDivElement | null> {
  const ref = useContext(EditorContainerContext);
  if (!ref) {
    throw new Error('useEditorContainer must be used within EditModeProvider');
  }
  return ref;
}
