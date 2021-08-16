import BigNumber from 'bignumber.js'
import { 
  Finding, 
  HandleTransaction, 
  TransactionEvent, 
  FindingSeverity, 
  FindingType 
} from 'forta-agent'

const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  const findings: Finding[] = []

  // create finding if gas used is higher than threshold
  const gasUsed = new BigNumber(txEvent.gasUsed)
  if (gasUsed.isGreaterThan("1000000")) {
    findings.push(Finding.fromObject({
      name: "High Gas Used",
      description: `Gas Used: ${gasUsed}`,
      alertId: "FORTA-1",
      severity: FindingSeverity.Medium,
      type: FindingType.Suspicious
    }))
  }

  return findings
}

export default {
  handleTransaction,
}
