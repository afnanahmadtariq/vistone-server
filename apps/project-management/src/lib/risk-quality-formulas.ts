export type RiskQualityMetricRow = {
  key: string;
  label: string;
  value: number | null;
  formula: string;
  explanation: string;
};

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : null;
}

export type RiskRegisterBurndownHint = {
  resolvedRiskCount: number;
  totalRiskCount: number;
};

/**
 * Computes common SQA / testing risk formulas from numeric inputs.
 * Inputs are plain JSON numbers (user-entered or sourced from other systems).
 */
export function computeRiskQualityMetrics(
  raw: Record<string, unknown>,
  burndown: RiskRegisterBurndownHint
): RiskQualityMetricRow[] {
  const P = n(raw.probability);
  const I = n(raw.impact);
  const S = n(raw.severity);
  const O = n(raw.occurrence);
  const D = n(raw.detection);
  const C = n(raw.costImpact);
  const reBefore = n(raw.reBefore);
  const reAfter = n(raw.reAfter);
  const mitigationCost = n(raw.mitigationCost);
  const defects = n(raw.defects);
  const kloc = n(raw.kloc);
  const failures = n(raw.failures);
  const timeUnits = n(raw.timeUnits);
  const operatingTime = n(raw.operatingTime);
  const failureCount = n(raw.failureCount);
  const repairTime = n(raw.repairTime);
  const repairs = n(raw.repairs);
  const testCoverage = n(raw.testCoverage);
  const failedDemands = n(raw.failedDemands);
  const totalDemands = n(raw.totalDemands);
  const initialRisk = n(raw.initialRisk);
  const mitigatedRisk = n(raw.mitigatedRisk);
  const productionDefects = n(raw.productionDefects);
  const totalDefectsLeakage = n(raw.totalDefectsLeakage);
  const businessImpact = n(raw.businessImpact);
  const failureLikelihood = n(raw.failureLikelihood);

  const RE = P != null && I != null ? P * I : null;
  const resolvedRisks = (n(raw.resolvedRisks) ?? burndown.resolvedRiskCount) as number;
  const totalRisks = (n(raw.totalRisks) ?? burndown.totalRiskCount) as number;
  const riskBurndown =
    Number.isFinite(totalRisks) && totalRisks > 0 ? resolvedRisks / totalRisks : null;
  const RPN = S != null && O != null && D != null ? S * O * D : null;
  const EMV = P != null && C != null ? P * C : null;
  const RRL =
    reBefore != null && reAfter != null && mitigationCost != null && mitigationCost !== 0
      ? (reBefore - reAfter) / mitigationCost
      : null;
  const defectDensity =
    defects != null && kloc != null && kloc !== 0 ? defects / kloc : null;
  const failureRate =
    failures != null && timeUnits != null && timeUnits !== 0 ? failures / timeUnits : null;
  const mtbf =
    operatingTime != null && failureCount != null && failureCount !== 0
      ? operatingTime / failureCount
      : null;
  const mttr =
    repairTime != null && repairs != null && repairs !== 0 ? repairTime / repairs : null;
  const residualRiskProportional =
    testCoverage != null && testCoverage > 0 ? 100 / testCoverage : null;
  const pofod =
    failedDemands != null && totalDemands != null && totalDemands !== 0
      ? failedDemands / totalDemands
      : null;
  const availability =
    mtbf != null && mttr != null && mtbf + mttr !== 0 ? mtbf / (mtbf + mttr) : null;
  const residualRisk =
    initialRisk != null && mitigatedRisk != null ? initialRisk - mitigatedRisk : null;
  const defectLeakage =
    productionDefects != null &&
    totalDefectsLeakage != null &&
    totalDefectsLeakage !== 0
      ? (productionDefects / totalDefectsLeakage) * 100
      : null;
  const testingPriority =
    businessImpact != null && failureLikelihood != null
      ? businessImpact * failureLikelihood
      : null;

  const rows: RiskQualityMetricRow[] = [
    {
      key: "RE",
      label: "Risk Exposure (RE)",
      value: RE,
      formula: "RE = P × I",
      explanation: "Multiply probability of failure by impact/severity to prioritize testing effort.",
    },
    {
      key: "RPN",
      label: "Risk Priority Number (RPN)",
      value: RPN,
      formula: "RPN = S × O × D",
      explanation: "FMEA-style ranking from Severity × Occurrence × Detection.",
    },
    {
      key: "EMV",
      label: "Expected Monetary Value (EMV)",
      value: EMV,
      formula: "EMV = P × C",
      explanation: "Expected financial loss: probability × cost impact.",
    },
    {
      key: "RRL",
      label: "Risk Reduction Leverage (RRL)",
      value: RRL,
      formula: "RRL = (RE_before − RE_after) / Cost_mitigation",
      explanation: "Mitigation effectiveness per unit cost.",
    },
    {
      key: "defectDensity",
      label: "Defect Density",
      value: defectDensity,
      formula: "Defects / KLOC",
      explanation: "Defects per thousand lines of code.",
    },
    {
      key: "failureRate",
      label: "Failure Rate",
      value: failureRate,
      formula: "Failures / Time",
      explanation: "Failures per time unit (e.g. per hour of test execution).",
    },
    {
      key: "MTBF",
      label: "Mean Time Between Failures (MTBF)",
      value: mtbf,
      formula: "MTBF = Operating Time / Failures",
      explanation: "Higher MTBF implies lower operational risk.",
    },
    {
      key: "MTTR",
      label: "Mean Time To Repair (MTTR)",
      value: mttr,
      formula: "MTTR = Repair Time / Repairs",
      explanation: "Average recovery time for maintenance/support risk.",
    },
    {
      key: "testCoverageRisk",
      label: "Test coverage risk index",
      value: residualRiskProportional,
      formula: "Index ∝ 1 / Test Coverage (here: 100 / coverage%)",
      explanation: "Higher coverage lowers this heuristic residual-risk index.",
    },
    {
      key: "POFOD",
      label: "Probability of Failure on Demand (POFOD)",
      value: pofod,
      formula: "POFOD = Failed Demands / Total Demands",
      explanation: "Likelihood the system fails when invoked.",
    },
    {
      key: "availability",
      label: "Availability",
      value: availability,
      formula: "Availability = MTBF / (MTBF + MTTR)",
      explanation: "Uses MTBF and MTTR computed from the inputs above when present.",
    },
    {
      key: "residualRisk",
      label: "Residual Risk",
      value: residualRisk,
      formula: "Residual Risk = Initial Risk − Mitigated Risk",
      explanation: "Remaining risk after controls or testing.",
    },
    {
      key: "riskBurndown",
      label: "Risk burndown rate",
      value: riskBurndown,
      formula: "Resolved Risks / Total Risks",
      explanation: "Uses register counts unless overridden in inputs.",
    },
    {
      key: "defectLeakage",
      label: "Defect leakage (%)",
      value: defectLeakage,
      formula: "(Production Defects / Total Defects) × 100",
      explanation: "Escaped defects ratio for QA effectiveness.",
    },
    {
      key: "testingPriority",
      label: "Risk-based testing priority",
      value: testingPriority,
      formula: "Priority = Business Impact × Failure Likelihood",
      explanation: "Relative priority for test focus areas.",
    },
  ];

  return rows;
}

export function metricsToComputedObject(rows: RiskQualityMetricRow[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    out[r.key] = { value: r.value, formula: r.formula, explanation: r.explanation, label: r.label };
  }
  return out;
}
