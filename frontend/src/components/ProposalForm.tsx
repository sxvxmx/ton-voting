import { FormEvent, useState } from 'react';

type CreateProposalInput = {
  title: string;
  description: string;
  deadlineTs: number;
  quorum: number;
};

type Props = {
  disabled: boolean;
  onSubmit: (value: CreateProposalInput) => Promise<void>;
};

export function ProposalForm({ disabled, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [quorum, setQuorum] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    if (!title.trim() || !description.trim() || !deadline || !Number.isFinite(deadlineTs) || deadlineTs <= Math.floor(Date.now() / 1000)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        deadlineTs,
        quorum,
      });
      setTitle('');
      setDescription('');
      setDeadline('');
      setQuorum(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h2>Create Proposal</h2>
      <form onSubmit={submit} className="proposal-form">
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} required />
        </label>
        <div className="grid-two">
          <label>
            Deadline
            <input
              type="datetime-local"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              required
            />
          </label>
          <label>
            Quorum
            <input
              type="number"
              min={1}
              value={quorum}
              onChange={(event) => setQuorum(Number(event.target.value))}
              required
            />
          </label>
        </div>
        <button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Create (0.25 TON)'}
        </button>
      </form>
    </section>
  );
}
