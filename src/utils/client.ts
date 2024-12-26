import { Chain, createPublicClient, http } from "viem";
import { scroll, sepolia, optimism, zksync, arbitrum, base } from "viem/chains";

export function GetClient(chainId: number) {
    let chain: Chain = optimism;
    if (chainId == 10) chain = optimism;
    if (chainId == 8453) chain = base;
    if (chainId == 11155111) chain = sepolia;
    if (chainId == 324) chain = zksync;
    if (chainId == 534352) chain = scroll; 
    if (chainId == 42161) chain = arbitrum; 
  
    return createPublicClient({
      chain: chain,
      transport: http(),
    });
  }
