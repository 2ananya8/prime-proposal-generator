import { useCallback, useEffect, useMemo, useState } from "react";
import { buildTwoPageLetter, type TwoPageLetterFields } from "@/lib/two-page-proposal";

export function useTwoPageLetterHtml(fields: TwoPageLetterFields, proposalDate: string) {
  const [letterHtml, setLetterHtml] = useState("");
  const [letterCustomized, setLetterCustomized] = useState(false);

  const generatedLetter = useMemo(
    () => buildTwoPageLetter(fields, proposalDate),
    [fields, proposalDate],
  );

  useEffect(() => {
    if (!letterCustomized) setLetterHtml(generatedLetter);
  }, [generatedLetter, letterCustomized]);

  const updateLetterHtml = (html: string) => {
    setLetterHtml(html);
    setLetterCustomized(true);
  };

  const regenerateFromTemplate = () => {
    setLetterCustomized(false);
    setLetterHtml(buildTwoPageLetter(fields, proposalDate));
  };

  const loadSavedLetter = useCallback((html: string, customized: boolean) => {
    setLetterCustomized(customized);
    setLetterHtml(customized ? html : buildTwoPageLetter(fields, proposalDate));
  }, [fields, proposalDate]);

  return {
    letterHtml,
    letterCustomized,
    updateLetterHtml,
    regenerateFromTemplate,
    loadSavedLetter,
  };
}
