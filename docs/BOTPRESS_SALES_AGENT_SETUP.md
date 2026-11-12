# Botpress sales agent setup

RevRecovery loads Botpress only on the public marketing page and only when a
valid Botpress-hosted configuration URL is present. Without the environment
variable, no Botpress code or network request is added to the page.

## Activate the widget

1. Create a free Botpress workspace and publish an agent.
2. Create a Knowledge Base and upload
   `docs/BOTPRESS_AGENT_KNOWLEDGE.md`. Add the public RevRecovery homepage as
   a separate website source if you want Botpress to recrawl current marketing
   copy.
3. Test the approved questions in Botpress Preview, then publish the agent.
4. In Botpress, open **Webchat → Deploy Settings** and copy the embed code.
5. From the second script tag, copy the URL hosted on
   `https://files.bpcontent.cloud/...js`.
6. Set `NEXT_PUBLIC_BOTPRESS_CONFIG_URL` to that URL locally and in Vercel.
7. Deploy a Preview first and test the agent before adding the variable to
   Production.

The shared Botpress loader is deferred until the browser is idle. The
Botpress-specific configuration is loaded only after that loader is ready.

## Agent boundaries

Train the agent only on approved public RevRecovery material. It should:

- identify itself as an AI assistant;
- explain RevRecovery, Stripe test-mode setup, pricing, and product controls;
- offer the product demo, a live conversation, or a scheduled call;
- ask permission before collecting a name, email address, or company details;
- avoid promising a recovery rate, revenue result, or guaranteed outcome;
- avoid legal, tax, financial, or card-decline advice;
- never request Stripe credentials, card information, passwords, webhook
  secrets, or customer data;
- hand uncertain questions to a person rather than inventing an answer.

Keep the agent disconnected from Supabase and Stripe at launch. Add CRM lead
creation only after the public question-answering behaviour has been reviewed.

Do not upload the repository, `.env` files, implementation documentation,
database exports, Stripe data, customer records, or Codex conversations to the
Botpress Knowledge Base.

## Suggested opening message

> Hi — I’m RevRecovery’s AI assistant. I can explain how failed-payment
> recovery works, show you the product, or help you arrange a conversation.
> What would be most useful?

Suggested choices:

- See how RevRecovery works
- Check whether it fits my business
- Ask a question
- Book a conversation
