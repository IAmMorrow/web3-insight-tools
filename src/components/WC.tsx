"use client";

import WalletConnectClient from "@walletconnect/client";
import { IJsonRpcRequest, IWalletConnectSession } from "@walletconnect/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";

type WalletConnectState = {
  session: IWalletConnectSession | null;
  timedOut: boolean;
  selectedAccount: string | null;
};

const networks: NetworkConfig[] = [
  {
    chainId: 1,
    currency: "ethereum",
  },
];

type NetworkConfig = {
  chainId: number;
  currency: string;
};

type WCProps = {
  onAction: (type: "tx" | "mess", data: any) => void;
};

export function WC({ onAction }: WCProps) {
  const selectedAccountRef = useRef<string>();
  const wcRef = useRef<WalletConnectClient>();
  const [uri, setUri] = useState("");
  const [address, setAddress] = useState("");

  const [state, setState] = useState<WalletConnectState>({
    session: null,
    timedOut: false,
    selectedAccount: null,
  });

  const { session, selectedAccount, timedOut } = state;

  const createClient = useCallback(
    async (params: {
      uri?: string;
      session?: IWalletConnectSession;
    }): Promise<void> => {
      if (wcRef.current) {
        await wcRef.current.killSession();
      }
      const { uri, session } = params;
      if (!uri && !session) {
        throw new Error(
          "Need either uri or session to be provided to createClient"
        );
      }

      const wc = new WalletConnectClient({ uri, session });

      // synchronize WC state with react and trigger necessary rerenders
      const syncSessionWithReactState = () => {
        setState((oldState) => ({
          ...oldState,
          timedOut: false,
          session: {
            ...wc.session,
          },
        }));
      };

      wc.on("session_request", (error, payload) => {
        console.log("session_request", {
          error,
          payload,
        });

        if (error) {
        }

        syncSessionWithReactState();
      });

      wc.on("connect", () => {
        syncSessionWithReactState();
        localStorage.setItem("session", JSON.stringify(wc.session));

        if (uri) {
          localStorage.setItem("sessionURI", uri);
        }
      });

      wc.on("disconnect", () => {
        // cleaning everything and reverting to initial state
        setState((oldState) => {
          return {
            ...oldState,
            session: null,
          };
        });
        wcRef.current = undefined;
        localStorage.removeItem("session");
      });

      wc.on("error", (error) => {
        console.log("error", { error });
      });

      wc.on("call_request", async (error, payload: IJsonRpcRequest) => {
        console.log("call_request", { error, payload });

        switch (payload.method) {
          case "eth_sendTransaction": {
            const ethTX = payload.params[0];
            // CHECK TX HERE
            onAction("tx", ethTX);
            break;
          }

          case "personal_sign": {
            const ethMessage = payload.params[0];

            // HANDLE MESSAGE HERE
            break;
          }

          case "eth_sign": {
            const ethTX = payload.params[0];

            // HANDLE ETH SIGN HERE
            onAction("tx", ethTX);
            break;
          }

          case "eth_signTypedData": {
            const typedMessage = payload.params[0];
            // HANDLE SIGN TYPED MESSAGE
            break;
          }
        }
      });

      // saving the client instance ref for further usage
      wcRef.current = wc;
      syncSessionWithReactState();

      // a client is already connected
      if (wc.connected && selectedAccountRef.current) {
        // if a uri was provided, then the user probably want to connect to another dapp, we disconnect the previous one
        if (uri) {
          await wc.killSession();
          return createClient({ uri });
        }

        const networkConfig = networks.find(
          (networkConfig) => networkConfig.currency === "ethereum"
        );
        if (networkConfig) {
          wc.updateSession({
            chainId: networkConfig.chainId,
            accounts: [selectedAccountRef.current],
          });
        }
      }
    },
    []
  );

  const handleAccept = useCallback(() => {
    if (wcRef.current && address) {
      const networkConfig = networks.find(
        (networkConfig) => networkConfig.currency === "ethereum"
      );
      console.log({ networkConfig, networks });
      if (networkConfig) {
        wcRef.current.approveSession({
          chainId: networkConfig.chainId,
          accounts: [address],
        });
      }
    }
  }, [address]);

  const handleDecline = useCallback(() => {
    if (wcRef.current) {
      wcRef.current.rejectSession({
        message: "DECLINED_BY_USER",
      });
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    if (wcRef.current) {
      wcRef.current.killSession();
    }
  }, []);

  useEffect(() => {
    const existingSessionRaw = localStorage.getItem("session");

    if (existingSessionRaw) {
        const existingSessing = JSON.parse(existingSessionRaw);
        createClient({ session: existingSessing });
    }
  }, [])

  return (
    <>
      {session ? (
        <>
          {session.peerMeta ? (
            <>
              {session.connected ? (
                <div className="inline-flex flex-col">
                  <>Connected to {session.peerMeta.name}</>
                  <button
                    type="button"
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {session.peerMeta.name} is trying to connect
                  <div className="mt-3">
                    <button
                      type="button"
                      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      onClick={handleAccept}
                    >
                      Yess
                    </button>
                    <button
                      type="button"
                      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                      onClick={handleDecline}
                    >
                      Nope
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>pending connection</>
          )}
        </>
      ) : (
        <>
          <div>
            <label
              htmlFor="networks"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Select a network
            </label>
            <select
              id="networks"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              {networks.map((network) => (
                <option
                  key={network.chainId}
                  value={network.chainId}
                >{`${network.currency} [${network.chainId}]`}</option>
              ))}
            </select>
          </div>
          <div className="mt-6">
            <label
              htmlFor="address"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Address
            </label>
            <input
              type="text"
              id="address"
              value={address}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="0xCA...FE45"
              required
              onChange={(event) => {
                setAddress(event.currentTarget.value);
              }}
            />
          </div>
          <div className="mt-6">
            <label
              htmlFor="wcURI"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Wallet Connect v1 URI
            </label>
            <input
              type="text"
              id="wcURI"
              value={uri}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="wc:1fb..@1?bridge=https..."
              required
              onChange={(event) => {
                setUri(event.currentTarget.value);
              }}
            />
          </div>
          <div className="mt-8">
            <button
              type="button"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
              onClick={() => {
                createClient({ uri });
              }}
            >
              Connect
            </button>
          </div>
        </>
      )}
    </>
  );
}
