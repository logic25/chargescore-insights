
UPDATE analyses SET npv = (
  SELECT -GREATEST(0, analyses.total_project_cost - analyses.estimated_incentives) + SUM(
    (
      (analyses.num_stalls * analyses.kwh_per_stall_per_day * POWER(1.07, y - 1) * 365 * analyses.price_per_kwh)
      - (analyses.num_stalls * analyses.kwh_per_stall_per_day * POWER(1.07, y - 1) * 365 * analyses.electricity_cost)
      - (analyses.num_stalls * analyses.kwh_per_stall_per_day * POWER(1.07, y - 1) * 365 * 0.10 * POWER(1.03, y - 1))
      - COALESCE(analyses.annual_insurance, 5000)
    ) / POWER(1.08, y)
  )
  FROM generate_series(1, 15) AS y
)
WHERE npv IS NULL
  AND num_stalls IS NOT NULL
  AND kwh_per_stall_per_day IS NOT NULL
  AND price_per_kwh IS NOT NULL
  AND electricity_cost IS NOT NULL;
