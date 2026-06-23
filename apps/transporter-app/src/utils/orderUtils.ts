/**
 * Cleans up raw rejection reasons returned from the backend/database to display
 * only the specific customer/transporter entered reason without system prefixes.
 *
 * Examples:
 * - "Delivery leg rejected due to pickup rejection: Vehicle Not Available" -> "Vehicle Not Available"
 * - "Pickup leg rejected by SHG. Reason: transport_issue" -> "Transport Issue"
 * - "Vehicle Problem" -> "Vehicle Problem"
 */
export const cleanRejectReason = (reason: string | undefined): string => {
  if (!reason) return '';

  let cleaned = reason.trim();

  // 1. Check if the string matches a known prefix pattern and extract the substring
  const prefixRegexes = [
    /^(?:Delivery leg rejected due to pickup rejection|Pickup leg rejected due to delivery leg rejection|Pickup leg rejected by SHG|Delivery leg rejected by SHG|Pickup leg status synchronized to \w+ due to drop leg rejection)\.?\s*Reason:\s*(.*)$/i,
    /^Delivery leg rejected due to pickup rejection:\s*(.*)$/i,
    /^(?:Reason|Rejection):\s*(.*)$/i
  ];

  let matched = false;
  for (const regex of prefixRegexes) {
    const match = cleaned.match(regex);
    if (match && match[1]) {
      cleaned = match[1].trim();
      matched = true;
      break;
    }
  }

  // If we didn't match the specific regexes but there's a colon followed by space, let's take the last part
  if (!matched && cleaned.includes(':')) {
    const parts = cleaned.split(':');
    const lastPart = parts[parts.length - 1].trim();
    // Only use lastPart if it's not empty and isn't just a number or time (to avoid breaking date strings)
    if (lastPart && !/^\d+$/.test(lastPart) && !lastPart.toLowerCase().includes('am') && !lastPart.toLowerCase().includes('pm')) {
      cleaned = lastPart;
    }
  }

  // If the reason is the generic sentence without a specific sub-reason, return a clean generic message.
  if (cleaned.toLowerCase() === 'delivery leg rejected due to pickup rejection.') {
    return 'Pickup Rejection';
  }
  if (cleaned.toLowerCase() === 'pickup leg rejected due to delivery leg rejection.') {
    return 'Delivery Rejection';
  }

  // 2. Format database snake_case or camelCase values nicely
  // e.g. "transport_issue" -> "Transport Issue"
  // "vehicle_problem" -> "Vehicle Problem"
  if (/^[a-z0-9_]+$/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // Capitalize the first letter of the cleaned string if it's not already
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned.trim();
};
