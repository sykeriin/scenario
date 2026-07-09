export const RegressionCallout = () => {
  return (
    <div
      className="rounded-lg border p-4 text-center space-y-2"
      style={{
        borderColor: "hsl(0 40% 30% / 0.2)",
        background: "linear-gradient(135deg, hsl(0 60% 50% / 0.03), transparent)",
      }}
    >
      <div className="font-mono-stat text-[9px] uppercase tracking-widest" style={{ color: "hsl(0 50% 50% / 0.7)" }}>
        ◈ REGRESSION STATUS
      </div>
      <p className="font-body text-xs text-muted-foreground italic leading-relaxed">
        You have not yet regressed. The greatest protagonists have all died at least once.
      </p>
    </div>
  );
};
