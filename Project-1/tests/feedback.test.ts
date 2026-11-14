import { describe, it, expect, beforeEach } from "vitest";
import { BookmarkRepository } from "@/server/db/repository";
import { sqlite } from "@/server/db/client";

describe("Feedback System Repository & Access Control", () => {
  const testUserId = `usr_test_${Date.now()}`;
  const otherUserId = `usr_other_${Date.now()}`;

  beforeEach(() => {
    BookmarkRepository.ensureDefaultUser();
  });

  it("creates a user feedback ticket with default status 'received'", () => {
    const feedback = BookmarkRepository.createFeedback({
      userId: testUserId,
      userEmail: "tester@example.com",
      userName: "Test User",
      title: "Add keyboard shortcut for search",
      message: "It would be great to have Ctrl+Shift+F to search within current folder.",
      category: "feature",
    });

    expect(feedback).toBeDefined();
    expect(feedback.id).toMatch(/^fb_/);
    expect(feedback.userId).toBe(testUserId);
    expect(feedback.title).toBe("Add keyboard shortcut for search");
    expect(feedback.status).toBe("received");
    expect(feedback.category).toBe("feature");
  });

  it("filters feedback by userId for standard users", () => {
    const fb1 = BookmarkRepository.createFeedback({
      userId: testUserId,
      title: "User 1 Ticket",
      message: "Message from user 1",
      category: "general",
    });

    const fb2 = BookmarkRepository.createFeedback({
      userId: otherUserId,
      title: "User 2 Ticket",
      message: "Message from user 2",
      category: "bug",
    });

    const user1List = BookmarkRepository.getFeedbacks(testUserId);
    const user2List = BookmarkRepository.getFeedbacks(otherUserId);
    const allList = BookmarkRepository.getFeedbacks(); // Admin call with undefined userId

    expect(user1List.some((f) => f.id === fb1.id)).toBe(true);
    expect(user1List.some((f) => f.id === fb2.id)).toBe(false);

    expect(user2List.some((f) => f.id === fb2.id)).toBe(true);
    expect(user2List.some((f) => f.id === fb1.id)).toBe(false);

    expect(allList.some((f) => f.id === fb1.id)).toBe(true);
    expect(allList.some((f) => f.id === fb2.id)).toBe(true);
  });

  it("adds replies to a feedback thread including admin responses", () => {
    const feedback = BookmarkRepository.createFeedback({
      userId: testUserId,
      title: "Dark mode issue in Firefox",
      message: "The dropdown border is too light in dark mode.",
      category: "bug",
    });

    const adminReply = BookmarkRepository.addFeedbackReply({
      feedbackId: feedback.id,
      userId: "usr_admin",
      userEmail: "sasivan177@gmail.com",
      userName: "Sasivan (Admin)",
      isAdmin: true,
      message: "Thanks for reporting! We are pushing a fix in the next build.",
    });

    expect(adminReply).toBeDefined();
    expect(adminReply).not.toBeNull();
    expect(adminReply!.feedbackId).toBe(feedback.id);
    expect(adminReply!.isAdmin).toBe(true);

    const updatedFeedbacks = BookmarkRepository.getFeedbacks(testUserId);
    const target = updatedFeedbacks.find((f) => f.id === feedback.id);
    expect(target).toBeDefined();
    expect(target?.replies.length).toBeGreaterThanOrEqual(1);
    expect(target?.replies.some((r) => r.id === adminReply!.id && r.isAdmin)).toBe(true);
  });

  it("updates feedback status for admin triage tags", () => {
    const feedback = BookmarkRepository.createFeedback({
      userId: testUserId,
      title: "Feature status test",
      message: "Testing lifecycle",
      category: "improvement",
    });

    const ok1 = BookmarkRepository.updateFeedbackStatus(feedback.id, "processing");
    expect(ok1).toBe(true);

    let list = BookmarkRepository.getFeedbacks(testUserId);
    expect(list.find((f) => f.id === feedback.id)?.status).toBe("processing");

    const ok2 = BookmarkRepository.updateFeedbackStatus(feedback.id, "fixed");
    expect(ok2).toBe(true);

    list = BookmarkRepository.getFeedbacks(testUserId);
    expect(list.find((f) => f.id === feedback.id)?.status).toBe("fixed");

    // Invalid status should be rejected
    const invalid = BookmarkRepository.updateFeedbackStatus(feedback.id, "invalid_status_tag");
    expect(invalid).toBe(false);
  });
});

