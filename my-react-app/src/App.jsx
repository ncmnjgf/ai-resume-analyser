import React from "react";
import { useState, useEffect } from "react";

import constants,
{
  buildPresenceChecklist,
  METRIC_CONFIG,
} from "../constants";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;



function App() {

  const [isAiready, setAiready] = useState(false);
  const [isloading, setisloading] = useState(false);
  const [uploading, setuploading] = useState(null);
  const [analysis, setanalysis] = useState(null);
  const [resumeText, setresumeText] = useState("");
  const [presentchecklist, setpresentchecklist] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.puter?.ai?.chat) {
        setAiready(true);
        clearInterval(interval);
      }
    }, 300)//to check ai is loaded or not 
    return () => clearInterval(interval);
  }, []);//runs onces only 

  //functions for extracting pdf text
  const extractPDFText = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      const pdf = await pdfjsLib
        .getDocument({ data: arrayBuffer })
        .promise;

      const pageTexts = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
          const page = await pdf.getPage(index + 1);
          const textContent = await page.getTextContent();

          return textContent.items
            .map((item) => item.str)
            .join(" ");
        })
      );

      return pageTexts.join("\n").trim();
    } catch (error) {
      console.error("PDF text extraction failed:", error);
      return "";
    }
  };
  const parsedJSONresponse = (reply) => {
    try {
      const match = reply.match(/\{.*\}/);
      const parsed = match ? JSON.parse(match[0]) : {};
      if (!parsed.overScore && !parsed.error) {
        throw new Error(`Invalid AI response`);
      }
      return parsed;

    } catch (err) {
      throw new Error(`failed to parse AI response : ${err.message}`)
    }

  };

  const analyzeResume = async (text) => {
    const prompts = constants.ANALYZE_RESUME_PROMPT.replace("{{DOCUMENT_TEXT}}".text);
    const response = await window.puter.ai.chat(
      [
        {
          role: "system",
          content: "You are an expert resume reviewer...",
        },
        { role: "user", content: prompt },
      ], {
      model: "gpt-4o",
    });
    const result = parsedJSONresponse(
      typeof response === "string" ? response : response.message?.content || ""
    );
    if (result.error)
      throw new error(result.error);
    return result;
  }

  return (
    <div className="min-h-screen bg-main-gradient p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <h1 className="text-7xl text-white">Hopen the Ponny </h1>
    </div>
  );
}

export default App;
