import { createDeadline, deleteDeadline, updateDeadline } from "@/lib/api";

export const TestDeadline = async () => {
  const date = new Date();
  const deadlineWithTitle = await createDeadline({ title: "Test" });
  const deadlineWithDate = await createDeadline({
    title: "Test",
    expire_date: date.toISOString(),
  });
  const deadlineWithTitleAndComment = await createDeadline({
    title: "Test",
    comment: "Test comment",
  });
  const newDeadlineWithTitle = await updateDeadline(deadlineWithTitle.id, {
    title: "test 1",
  });
  const newDeadlineWithTitleAndDate = await updateDeadline(
    deadlineWithTitle.id,
    { title: "Test 1", expire_date: date.toISOString() },
  );

  console.log("Title", deadlineWithTitle);
  console.log("Date", deadlineWithDate);
  console.log("Comment", deadlineWithTitleAndComment);
  console.log("new Title", newDeadlineWithTitle);
  console.log("new Title and Date", newDeadlineWithTitleAndDate);

  await deleteDeadline(deadlineWithTitle.id);
  await deleteDeadline(deadlineWithDate.id);
  await deleteDeadline(deadlineWithTitleAndComment.id);
};
