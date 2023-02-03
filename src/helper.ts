import { formatUnits, parseUnits } from "ethers/lib/utils";

export function dataToGraphSummary(data: any): string {
    const {
        balanceChanges,
        contracts,
    } = data;
    const lines = ["%%{init: {'theme':'dark'}}%%", "classDiagram", "direction LR"]

    const map = contracts.reduce((acc: { [key: string]: any }, contract: any) => {
        acc[contract.address] = contract;
        return acc;
    }, {});

    const uniqueAddresses = balanceChanges.reduce((acc: Set<string>, balanceChange: any) => {
        acc.add(balanceChange.address);
        return acc;
    }, new Set());

    uniqueAddresses.forEach((address: string) => {
        lines.push(`class ${address}`);
    })

    balanceChanges.forEach((balanceChange: any) => {
        if (balanceChange.type === "NATIVE") {
            const symbol = "ETH";
            const delta = formatUnits(balanceChange.delta, 18);

            const signedDelta = delta[0] === "-" ? delta : `+${delta}`;

            lines.push(`${balanceChange.address} : ${signedDelta} ${symbol}`)
        }

        if (balanceChange.type === "ERC20") {
            const contract = map[balanceChange.contract];
            const symbol = contract.symbol;
            const delta = formatUnits(balanceChange.delta, contract.decimals);
            
            const signedDelta = delta[0] === "-" ? delta : `+${delta}`;

            lines.push(`${balanceChange.address} : ${signedDelta} ${symbol}`)
        }

        if (balanceChange.type === "ERC721" || balanceChange.type === "ERC1155") {
            const contract = map[balanceChange.contract];

            balanceChange.deltas.forEach((change: any) => {
                const delta = change.value;
                const signedDelta = delta[0] === "-" ? delta : `+${delta}`;
                const symbol = contract.symbol;


                lines.push(`${balanceChange.address} : ${signedDelta} ${symbol ? symbol : `${balanceChange.type}-${balanceChange.contract}`} ${change.id}`);

            })
        }
    })

    return lines.join("\n")
}

export function dataToGraph(data: any): string {
    const {
        events,
        contracts,
    } = data;

    const map = contracts.reduce((acc: { [key: string]: any }, contract: any) => {
        acc[contract.address] = contract;
        return acc;
    }, {})

    const lines = ["%%{init: {'theme':'dark'}}%%", "flowchart TD"];

    const transferEvents = events.filter((event: any) => event.type === "Transfer" || event.type === "TransferSingle" || event.type === "TransferBatch");

    transferEvents.forEach((event: any) => {
        let amount;

        if (event.standard === "ERC20") {
            const contract = map[event.contract];
            
            lines.push(`${event.from}-- ${formatUnits(event.amount, contract.decimals)} ${contract.symbol}-->${event.to}`)
        }

        if (event.standard === "NATIVE") {
            lines.push(`${event.from}-- ${formatUnits(event.amount, 18)} ETH-->${event.to}`)
        }

        if (event.standard === "ERC721") {
            const contract = map[event.contract];

            lines.push(`${event.from}-- 1 ${contract.symbol} ${event.tokenId}-->${event.to}`)
        }

        if (event.standard === "ERC1155") {
            const contract = map[event.contract];

            if (event.type === "TransferSingle") {
                lines.push(`${event.from}-- ${event.amount} ERC-1155-${contract.address} ${event.id}-->${event.to}`)
            }

            if (event.type === "TransferBatch") {
                event.ids.forEach((id: string, index: number) => {
                    lines.push(`${event.from}-- ${event.amounts[index]} ERC-1155-${contract.address} ${id}-->${event.to}`);
                })
            }
        }
    })

    return lines.join("\n")
}

/*
         "standard": "ERC721",
         "contract": "0x656d34a8309363302e46de99853f4cef30b85a1d",
         "type": "Transfer",
         "from": "0xf1aacf8b995ae350366430ab1f9a86af8cb52587",
         "to": "0x053a031856b23a823b71e032c92b1599ac1cc3f2",
         "tokenId": "2034"
         */