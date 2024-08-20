/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  MerkleDistributor,
  MerkleDistributorFactory,
} from "generated";

import Erc20ABI = require("../abis/ERC20.json");

import { GetClient } from "./utils/client";

MerkleDistributorFactory.DistributorCreated.contractRegister(({ event, context }) => {
  context.addMerkleDistributor(event.params.distributor);
});

MerkleDistributorFactory.DistributorCreated.handlerWithLoader({
  loader: async ({ event, context }) => {
    const currentToken = await context.Token.get(event.params.token_address);
    return {
      currentToken,
    };
  },
  handler: async ({event,context,loaderReturn}) => {
    const { currentToken } = loaderReturn;
    const zeroAddress = "0x0000000000000000000000000000000000000000"
    const chainId = event.chainId
    const eventId = `${chainId}-${event.params.id}`;
    try{
      const client = GetClient(chainId);

      if(currentToken == undefined){
        const tokenName = (await client.readContract({
          address: event.params.token_address as any,
          abi: Erc20ABI,
          functionName: "name",
          args: [],
        })) as string;
  
        const tokenSymbol = (await client.readContract({
          address: event.params.token_address as any,
          abi: Erc20ABI,
          functionName: "symbol",
          args: [],
        })) as string;
  
        const tokenDecimals = (await client.readContract({
          address: event.params.token_address as any,
          abi: Erc20ABI,
          functionName: "decimals",
          args: [],
        })) as number;
        // let tokenSymbol = 
  
        context.Token.set({
          id: event.params.token_address,
          address: event.params.token_address,
          symbol: tokenSymbol,
          name: tokenName,
          decimals: BigInt(tokenDecimals),
        });
      }

      let isETHResult = false
      if(event.params.token_address == zeroAddress){
        isETHResult = true
      }

      context.Distributor.set({
        id: event.params.distributor,
        totalAmount: event.params.total,
        name: event.params.name,
        message: event.params.message,
        tokenAddress: event.params.token_address,
        number: event.params.number,
        duration: event.params.duration,
        creator: event.params.creator,
        creationTimestamp: event.params.creation_time,
        expireTimestamp: event.params.creation_time + event.params.duration,
        token_id: event.params.token_address,
        refunder_id: "",
        remainToClaim: event.params.number,
        allClaimed: false,
        refunded: false,
        redpacketId: event.params.id,
        isETH: isETHResult
      });

    }catch(error){
      context.log.error(
        `Unable to handle event DistributorCreated`
      );
    }

    context.Lastupdate.set({
      id: "1",
      lastupdateTimestamp: BigInt(event.block.timestamp),
    })

  },
});



MerkleDistributor.Claimed.handlerWithLoader({
  loader: async ({ event, context }) => {
    const currentDistributor = await context.Distributor.get(event.srcAddress);
    return {
      currentDistributor,
    };
  },
  handler: async ({event,context,loaderReturn}) => {
    const { currentDistributor } = loaderReturn;
    

    if(currentDistributor == undefined){
      return
    }


    context.Claimer.set({
      id: event.block.hash + event.logIndex,
      claimTimestamp: BigInt(event.block.timestamp),
      distributor_id: event.srcAddress,
      index: event.params.index,
      claimer: event.params.account,
      amount: event.params.amount,
    })

    context.Lastupdate.set({
      id: "1",
      lastupdateTimestamp: BigInt(event.block.timestamp),
    })

    let currentRemainToClaim = currentDistributor.remainToClaim - BigInt(1)
    let currentAllClaimed = false
    if(currentRemainToClaim == BigInt(0)){
      currentAllClaimed = true
    }

    context.Distributor.set({
      ...currentDistributor,
      remainToClaim: currentRemainToClaim,
      allClaimed: currentAllClaimed,
      refunded: currentDistributor.refunded,
      isETH: currentDistributor.isETH,
      redpacketId: currentDistributor.redpacketId,
    });
  }
});


MerkleDistributor.Refund.handlerWithLoader({
  loader: async ({ event, context }) => {
    const currentDistributor = await context.Distributor.get(event.srcAddress);
    return {
      currentDistributor,
    };
  },
  handler: async ({event,context,loaderReturn}) => {
    const { currentDistributor } = loaderReturn;

    if(currentDistributor == undefined){
      return
    }

    const refundId = event.block.hash + event.logIndex
    context.Refund.set({
      id: refundId,
      distributor_id: event.srcAddress,
      to: event.params.to,
      amount: event.params.refund_balance,
      tokenAddress: currentDistributor.tokenAddress,
      blockNumber: BigInt(event.block.number),
      blockTimestamp: BigInt(event.block.timestamp),
    })

    context.Lastupdate.set({
      id: "1",
      lastupdateTimestamp: BigInt(event.block.timestamp),
    })

    context.Distributor.set({
      ...currentDistributor,
      refunder_id: refundId,
      remainToClaim: currentDistributor.remainToClaim,
      allClaimed: currentDistributor.allClaimed,
      refunded: true,
      redpacketId: currentDistributor.redpacketId,
      isETH: currentDistributor.isETH,
    })
  }
});