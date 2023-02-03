"use client";

import { parseUnits } from "ethers/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { WC } from "./WC";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Graph } from "./Graph";
import { dataToGraph, dataToGraphSummary } from "@/helper";

const insightUrl = "https://ledger-insight.vercel.app";

export function Tool() {
  const [apiData, setApiData] = useState(null);
  const [tab, setTab] = useState<"data" | "graph" | "summary">("data");
  const maxFeePerGas = useRef<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    fetch("https://api.blocknative.com/gasprices/blockprices").then(
      async (response) => {
        const parsedRes = await response.json();
        console.log(parsedRes);

        console.log(maxFeePerGas);
        const value = parseUnits(
          parsedRes.blockPrices[0].estimatedPrices[0].maxFeePerGas.toString(),
          "gwei"
        );
        console.log(value.toHexString());
        maxFeePerGas.current = value.toHexString();
      }
    );
  }, []);

  const handleAction = useCallback(async (type: "tx" | "mess", data: any) => {
    const body = JSON.stringify({
      includeEvents: true,
      includeContracts: true,
      transaction: {
        ...data,
        maxFeePerGas: maxFeePerGas.current,
      },
    });

    setLoading(true);
    const response = await fetch(`${insightUrl}/api/check/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    setLoading(false);

    const parsedResponse = await response.json();
    setApiData(parsedResponse);
  }, []);

  return (
    <div className="m-6 inline-flex flex-col">
      <div className="w-96 mb-6 flex flex-col">
        <WC onAction={handleAction} />
        {apiData ? (
          <div className="inline-flex rounded-md shadow-sm mt-6" role="group">
            <button
              type="button"
              onClick={() => {
                setTab("data");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
            >
              Raw Data
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("graph");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("summary");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
            >
              Summary
            </button>
          </div>
        ) : null}
      </div>
      {isLoading ? <div>Got transaction, crunching ...</div> : null}
      {apiData ? (
        tab === "graph" ? (
          <Graph data={dataToGraph(apiData)} />
        ) : tab === "data" ? (
          <CodeMirror
            value={JSON.stringify(apiData, null, 3)}
            extensions={[json()]}
            theme={"dark"}
            readOnly
            height="auto"
            basicSetup={{
              lineNumbers: false,
              highlightActiveLineGutter: false,
              highlightActiveLine: false,
              foldGutter: false,
            }}
          />
        ) : tab === "summary" ? (
          <Graph data={dataToGraphSummary(apiData)} />
        ) : null
      ) : null}
    </div>
  );
}
