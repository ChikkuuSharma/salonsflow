/**
 * Reusable international currency formatter for SalonsFlow
 */
export function formatCurrency(
  amount: number | string,
  currencyCodeOrSymbol: string = "$"
): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const rawSymbol = (currencyCodeOrSymbol || "$").trim();

  // Handle standard currency symbols/codes
  switch (rawSymbol.toUpperCase()) {
    case "$":
    case "USD":
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case "£":
    case "GBP":
      return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case "€":
    case "EUR":
      return `€${num.toLocaleString("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case "₹":
    case "INR":
      return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case "AED":
      return `AED ${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case "CAD":
    case "CA$":
      return `CA$${num.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    case "AUD":
    case "AU$":
      return `AU$${num.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    default:
      if (rawSymbol.length > 2) {
        return `${rawSymbol} ${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
      return `${rawSymbol}${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}
