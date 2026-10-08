import React from "react";

export interface MarkdownViewProps {
  html?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ html }) => {
  if (!html) return null;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MarkdownView;
