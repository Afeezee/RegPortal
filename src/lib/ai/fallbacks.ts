import type { ConstraintIssue } from "@/lib/registration/constraints";

export function buildFallbackChatReply(prompt: string) {
  return `Here is a quick answer based on your record: I heard "${prompt}". The AI assistant is not fully connected right now, so this is a short reply — but your course list and warnings on this page are still accurate.`;
}

export function buildViolationExplanation(issue: ConstraintIssue) {
  return `We flagged ${issue.courseCode ?? "this selection"} because ${issue.message.toLowerCase()} Take another look at your list and change the selection before you send it.`;
}

export function buildCourseInsight(courseCode: string, title: string) {
  return `${courseCode} ${title} is an elective option in the handbook. Choose it if the topic fits the area you want to build your final project or career around.`;
}

export function buildSubmissionSummary(totalUnits: number, expectedUnits: number | null, issueCount: number) {
  return `You have picked ${totalUnits} credit units${expectedUnits ? ` (your department expects around ${expectedUnits})` : ""}. ${issueCount === 0 ? "No warnings — you are ready to send this to your adviser." : `There ${issueCount === 1 ? "is 1 thing" : `are ${issueCount} things`} to check before you send it.`}`;
}
