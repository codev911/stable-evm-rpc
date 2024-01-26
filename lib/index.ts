import axios from 'axios';

import { chainList } from './chain/list.chain';
import { reportState } from './interface/report.interface';
import { liveRpcOption } from './interface/liverpc.interface';

const defaultTimeout: number = 1500;

const getChainPost = async (
	rpcUrl: string,
	timeout?: number
): Promise<number | 'unknown'> => {
	try {
		const { status, data } = await axios.post(
			rpcUrl,
			{ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 83 },
			{
				timeout:
					timeout !== undefined && timeout !== null ? timeout : defaultTimeout,
			}
		);

		if (status === 200 && data.result !== undefined) {
			return parseInt(data.result);
		} else {
			return 'unknown';
		}
	} catch (error) {
		return 'unknown';
	}
};

const getBlockPost = async (
	rpcUrl: string,
	timeout?: number
): Promise<number | 'unknown'> => {
	try {
		const { status, data } = await axios.post(
			rpcUrl,
			{ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 83 },
			{
				timeout:
					timeout !== undefined && timeout !== null ? timeout : defaultTimeout,
			}
		);

		if (status === 200 && data.result !== undefined) {
			return parseInt(data.result);
		} else {
			return 'unknown';
		}
	} catch (error) {
		return 'unknown';
	}
};

const getIsSyncingPost = async (
	rpcUrl: string,
	timeout?: number
): Promise<boolean> => {
	try {
		const { status, data } = await axios.post(
			rpcUrl,
			{ jsonrpc: '2.0', method: 'eth_syncing', params: [], id: 83 },
			{
				timeout:
					timeout !== undefined && timeout !== null ? timeout : defaultTimeout,
			}
		);

		if (status === 200 && data.result !== undefined) {
			if (typeof data.result === 'boolean') {
				return data.result;
			} else {
				console.log(data.result);
			}
		} else {
			return true;
		}
	} catch (error) {
		return true;
	}
};

export const getPublicRpc = (chainId: number): string[] => {
	try {
		const rpcList = chainList.filter(a => a.chainId === chainId);
		return rpcList[0].urls;
	} catch (error) {
		return [];
	}
};

export const testRpc = async (
	rpcUrl: string,
	timeout?: number
): Promise<reportState> => {
	const getStart = new Date().getTime();
	const aggregate = await Promise.all([
		getChainPost(rpcUrl, timeout),
		getBlockPost(rpcUrl, timeout),
		getIsSyncingPost(rpcUrl, timeout),
	]);

	const getEnd = new Date().getTime();
	const getMs = getEnd - getStart;

	return {
		isSyncing: aggregate[2],
		lastBlock: aggregate[1],
		chainId: aggregate[0],
		ms: getMs,
		url: rpcUrl,
	};
};

export const getLiveRpc = async (
	targetChain: number,
	options?: liveRpcOption
): Promise<reportState[]> => {
	const getRpc = getPublicRpc(targetChain);
	if (getRpc.length === 0 && options?.rpcs === undefined)
		throw new Error('no rpc');

	const promt = [];

	getRpc.forEach(rpc => {
		promt.push(
			testRpc(
				rpc,
				options?.timeout !== undefined && options?.timeout !== null
					? options.timeout
					: undefined
			)
		);
	});

	if (options?.rpcs !== undefined && options?.rpcs.length > 0) {
		options?.rpcs.forEach(rpc => {
			promt.push(
				testRpc(
					rpc,
					options?.timeout !== undefined && options?.timeout !== null
						? options.timeout
						: undefined
				)
			);
		});
	}

	const res = await Promise.all(promt);
	const final: reportState[] = [];

	res.forEach(a => {
		if (
			a.chainId === targetChain &&
			a.lastBlock !== 'unknown' &&
			a.isSyncing === false
		) {
			final.push(a);
		}
	});

	const sortByMs = final.sort((a: any, b: any) => a.ms - b.ms);
	const sortByBlock = sortByMs.sort((a: any, b: any) => b.lastBlock - a.lastBlock);

	return sortByBlock;
};

export const getBestLiveRpc = async (
	targetChain: number,
	options?: liveRpcOption
): Promise<reportState> => {
	const res = await getLiveRpc(targetChain, options);
	return res[0];
}
