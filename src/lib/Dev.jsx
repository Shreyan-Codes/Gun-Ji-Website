// Renders a plain string, wrapping Devanagari runs in <span className="dev">
// so they pick up the Rozha One face — lets product names live in the
// database as plain text ("USE दिमाग") while rendering exactly like the old
// hand-written JSX. Non-strings (legacy JSX nodes) pass through untouched.

const DEV_RUN = /([ऀ-ॿ]+)/g;

export default function Dev({ text }) {
  if (typeof text !== "string") return text;
  const parts = text.split(DEV_RUN);
  return parts.map((part, i) =>
    // capture-group split ⇒ odd indices are the Devanagari runs
    i % 2 === 1 ? (
      <span className="dev" key={i}>
        {part}
      </span>
    ) : (
      part
    )
  );
}
