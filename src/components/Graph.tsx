"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import mermaid from "mermaid";

type GraphProps = {
  data: string;
};

let currentId = 0;
const uuid = () => `mermaid-${(currentId++).toString()}`;

export function Graph({ data }: GraphProps) {
  const [html, setHtml] = useState<null | string>(null);

  useEffect(() => {
    mermaid.mermaidAPI.render(uuid(), data, (svgCode) => setHtml(svgCode));
  }, [data]);
  
  if (!html) {
    return null;
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} className="mermaid">
    </div>
  );
}
