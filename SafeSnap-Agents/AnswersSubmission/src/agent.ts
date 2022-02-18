import {
  Finding,
  getEthersProvider,
  HandleTransaction,
  TransactionEvent,
} from "forta-agent";
import OracleFetcher from "./oracle.fetcher";
import { EVENTS_SIGNATURES, SAFESNAP_CONTRACT, createFinding } from "./utils";

const FETCHER = new OracleFetcher(getEthersProvider());
let oracle: string = "";
let safesnap_contract = SAFESNAP_CONTRACT;

export const initialize =
  (reality_module: string, fetcher: OracleFetcher) => async () => {
    oracle = await fetcher.getOracle("latest", reality_module);
  };

export const provideHandleTransaction =
  (_oracle: string): HandleTransaction =>
  async (txEvent: TransactionEvent): Promise<Finding[]> => {
    const findings: Finding[] = [];
    if (!_oracle) _oracle = oracle;

    // get events logs on the oracle.
    txEvent.filterLog(EVENTS_SIGNATURES, _oracle).map((log) => {
      findings.push(createFinding(log));
    });

    return findings;
  };

export default {
  initialize: initialize(safesnap_contract, FETCHER),
  handleTransaction: provideHandleTransaction(oracle),
};
