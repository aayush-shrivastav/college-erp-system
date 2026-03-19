/**
 * Marks Utility — Dynamic marks calculation
 *
 * calculateFinalMarks(exams, assignment, attendance)
 *
 * Logic:
 *   exams      = array of 3 exam totals (secA + secB + secC per exam)
 *   Pick best 2 → average them
 *   + assignment (out of 10)
 *   + attendance (out of 6)
 *   = Final marks
 */

/**
 * @param {number[]} examTotals - array of exam totals (e.g. [45, 38, 50])
 * @param {number}   assignment - assignment marks (0–10)
 * @param {number}   attendance - attendance marks (0–6)
 * @returns {{ examTotals: number[], best2: number[], best2Average: number, assignment: number, attendance: number, finalMarks: number }}
 */
const calculateFinalMarks = (examTotals, assignment, attendance) => {
  // --- sort descending, pick best 2 ---
  const sorted = [...examTotals].sort((a, b) => b - a);
  const best2 = sorted.slice(0, 2);
  const best2Average = best2.reduce((sum, m) => sum + m, 0) / 2;

  // --- final = best2Average + assignment + attendance ---
  const finalMarks = parseFloat((best2Average + assignment + attendance).toFixed(2));

  return {
    examTotals,
    best2,
    best2Average: parseFloat(best2Average.toFixed(2)),
    assignment,
    attendance,
    finalMarks,
  };
};

module.exports = { calculateFinalMarks };
