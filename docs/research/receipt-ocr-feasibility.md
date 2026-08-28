# Receipt OCR feasibility

_Research for [#4](https://github.com/fkeenv/tabby/issues/4). Sources checked 2026-08-28. Every figure below is either quoted from a first-party page (linked inline) or explicitly labelled as computed / not established._

## Recommendation

**Rule receipt OCR out of scope for the Tabby MVP.** Not because it is expensive — it is not, at roughly half a cent per receipt — but because the one thing it has to be good at cannot be shown to be good enough from any published source, and because verifying it requires a product that does not exist yet.

Five findings drive this:

1. **The accuracy Tabby depends on is not established, by anyone.** No published primary source measures per-item quantity *and* unit price extraction, separated from tax and tip, on real phone photos. SROIE — the most-cited receipt benchmark — measures four header fields and no line items at all. The one 2026 benchmark built for this (ReceiptBench, 10,656 real receipts) puts GPT-5 at **0.4893 F1** and Gemini-3-Pro at **0.5781** on line-item structural parsing, its own hardest sub-task, and its schema does not even separate quantity from unit price. No vendor publishes an audited number either; Azure's Transparency Note explicitly declines to give one. (§2)

2. **Tabby's domain model makes silent mis-parses expensive in a specific way.** A tax or service line parsed as a Line Item does not error — it sits in the item list where it must be *claimed*, instead of being an **Adjustment** allocated across claimers. It will either go unclaimed and leave money unallocated, or get claimed by one person and be wrong for everyone. A wrong unit price propagates into every Balance in the Group. (§4)

3. **Which forces OCR to be a draft, never a commit** — the Organizer must confirm every line before anything is persisted. That is the only safe shape, and it takes most of the value back: the Organizer still reads and checks 14 lines. The saving is typing, not attention. The chore the feature exists to remove is only half removed.

4. **There is no product to attach it to yet.** `main` is an unmodified `laravel/vue-starter-kit`: `routes/web.php` has three routes, `app/Models/` has one file, and there is no Group, Expense, Line Item, Claim, Adjustment, or Participant anywhere in the repo. Receipt OCR is an accelerator for an expense-entry flow that has not been designed, let alone built. (§4)

5. **Cost is not the constraint, and saying so matters.** ~$0.0055/receipt on Claude Haiku 4.5, under $30/month at 5,000 receipts. Removing the money argument is what forces the decision onto evidence, which is where it belongs. (§3)

**Privacy verdict: workable, but it adds an obligation Tabby cannot discharge.** Anthropic, Google Document AI and Mindee all have clean terms — no training on submitted content, short or zero retention. Three vendors are traps: Veryfi trains on submitted personal data by default with a contract-gated opt-out; AWS Textract trains by default unless a free AWS Organizations opt-out policy is set *before first use*; Gemini's unpaid tier both trains on content and permits human reviewers to read it. But the deeper problem is not vendor terms. The Organizer consents by uploading; the other people on the receipt cannot be asked, because Tabby deliberately holds no way to reach them. Any implementation must disclose the third party at the upload control and keep manual entry a first-class path. (§5)

### Scope verdict

**Out of scope for this map**, whose destination is a build-ready MVP spec. This is not a decision waiting on a preference — it is a feature whose central parameter is unmeasured, and it therefore cannot be specified build-ready. Recording it as "deferred" would leave it on the board implying it is nearly ready; it is not.

### What would have to change to revisit it

Three things, in order:

1. **The core ships and gets used.** Groups, Expenses, Line Items, Claims, Adjustments, the Claim Link. Until real Organizers have entered real expenses, "typing 14 line items is the worst chore" is a hypothesis, not a finding.
2. **A measured eval exists.** 30–50 real receipts from the actual target market, hand-labelled with description, quantity, unit price, and tax/tip/service, scored end-to-end against a candidate. This is a day or two of work and it is the only way to get the number that §2 says nobody has. Set the pass bar deliberately *before* running it — something like "fewer than 1 in 10 receipts needs a correction the Organizer would not have caught by eye."
3. **The eval passes.** If it does not, the answer stays no regardless of how cheap the API is.

### If it is ever built, this is the shape

Recorded here so the work is not redone:

- **Claude Haiku 4.5 with structured outputs via the official `anthropic-ai/sdk` PHP SDK** is the strongest starting point: cheapest of every option surveyed, typed PHP objects via `StructuredOutputModel` rather than array-wrangling, no training on commercial inputs, and one HTTP dependency instead of a cloud account.
- **AWS Textract `AnalyzeExpense`** is the best specialist fallback: the only vendor with a native `SERVICE_CHARGE` field alongside `GRATUITY` and `TAX` — a direct match for Tabby's **Adjustment** — plus per-field confidence scores that a review UI can surface. Set the AWS Organizations training opt-out policy first.
- **Not** Google Document AI (no `line_item/unit_price` field at all), **not** Veryfi ($500/month floor, trains by default), **not** self-hosting (worse measured accuracy, a second Python runtime, and $195–$540/month for an always-on GPU).
- Queued job with `#[Backoff([1, 5, 10])]` and a `failed()` handler; `usePoll` on the Inertia page since no broadcasting is installed; downscale client-side to a 1568 px long edge before upload; disclosure at the upload control; and decide explicitly whether the image is discarded after parsing — keeping it makes Tabby a store of receipt photographs, which is a worse privacy posture than the vendor call it was worried about.

## 1a. Hosted receipt-specific APIs

Receipt-specific APIs exist and several return exactly the shape Tabby's domain model wants. Their schemas are worth quoting, because they show what "receipt-specific" buys over general OCR — and where two of the obvious candidates quietly fall short.

**AWS Textract `AnalyzeExpense` — the best schema fit.** From the [expense analysis field list](https://docs.aws.amazon.com/textract/latest/dg/invoices-receipts.html), the line-item types are:

> Line Item/Item Description — `ITEM` · Line Item/Quantity — `QUANTITY` · Line Item/Total Price — `PRICE` · Line Item/Unit Price — `UNIT_PRICE` · Line Item/ProductCode — `PRODUCT_CODE`

and the summary types include `TOTAL`, `SUBTOTAL`, `TAX`, `SERVICE_CHARGE`, `GRATUITY`, `DISCOUNT`. That maps onto Tabby's vocabulary almost one-to-one: `ITEM`/`QUANTITY`/`UNIT_PRICE` is a **Line Item**; `TAX`/`SERVICE_CHARGE`/`GRATUITY` are **Adjustments**. It is the only vendor surveyed with a dedicated, named service-charge field. Response shape is `ExpenseDocuments → LineItemGroups → LineItems → LineItemExpenseFields`, each field carrying a `Confidence` score — exactly the signal a review UI wants for highlighting uncertain rows. `AnalyzeExpense` is synchronous for a single-page receipt; `StartExpenseAnalysis`/`GetExpenseAnalysis` are the async pair. Official `aws-sdk-php` SDK.

**Azure AI Document Intelligence `prebuilt-receipt` — also a good fit, but async-only.** v4.0 GA, API version 2024-11-30 ([docs](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/receipt)) returns an `Items` array — "Extracted line items, with name, quantity, unit price, and total price extracted" — with `Description`, `Quantity`, `Price` ("Individual price of each item unit"), and `TotalPrice`, plus top-level `Subtotal`, `TotalTax`, `Tip`, `Total`, and in v4.0 `TaxDetails[]` and `CountryRegion`. No dedicated service-charge field. The API is submit-and-poll (`Operation-Location`) with no synchronous mode, and there is **no official PHP SDK** — REST via Laravel's `Http::` client. Input limits: 50×50 to 10,000×10,000 px; 500 MB paid tier, 4 MB free tier.

**Google Cloud Document AI Expense Parser — disqualified on schema.** It exposes `line_item/quantity` and `line_item/amount` (the line total) but **has no `line_item/unit_price` field at all**; unit price exists only on the separate Invoice Parser, which is not built for consumer receipts. Deriving unit price as total ÷ quantity looks fine until a receipt carries a per-item discount or a weighed item, at which point it is silently wrong. Given that per-item unit price is precisely what Tabby needs, this rules Document AI out despite it having the cleanest privacy posture of the three clouds (§5).

**Mindee** returns `line_items[].quantity`, `.unit_price`, `.total_price` and `taxes[]` / `tips_gratuity` — a good schema fit, and the strongest privacy posture of the specialist vendors (§5). Its V2 API is async-only. **Veryfi** returns `line_items[].quantity`, `.price` (unit), `.total`, but trains on submitted personal data by default (§5). **Taggun** returns line items only on verbose endpoints with `extractLineItems=true`. **Klippa** rebranded to **Doxis** in March 2026; its legal pages redirect or 404 and its API is not publicly priced, so neither its terms nor its cost could be verified.

### No vendor publishes a usable accuracy number

This is worth stating plainly because it is easy to assume otherwise:

- **AWS** publishes no accuracy figure for `AnalyzeExpense`.
- **Azure's** Transparency Note explicitly declines to give a benchmark and tells customers to evaluate on their own data.
- **Veryfi's** "99.56%" traces to a single customer's self-report, not an audited benchmark.
- **Mindee's** "generally above 95%" and **Klippa's** "up to 99%" are marketing claims with no disclosed methodology or F1 table.

None of these is a measurement of per-item quantity and unit price on real photos. See §2.

### Cost, and where the curve breaks

| Vendor | Price | 100/mo | 1,000/mo | 5,000/mo | Free tier |
|---|---|---|---|---|---|
| **AWS Textract AnalyzeExpense** | $0.01/page to 1M pages, $0.008 after — [pricing](https://aws.amazon.com/textract/pricing/) | $1 | $10 | $50 | 100 pages/mo, **three months only** |
| **Azure prebuilt-receipt** | Pay-as-you-go, no monthly minimum on S0. Per-1,000-page figure **not established** — the [pricing page](https://azure.microsoft.com/en-us/pricing/details/ai-document-intelligence/) renders `$-` placeholders | ~$1 | ~$10 | ~$50 | F0: 500 pages/month |
| **Google Document AI Expense Parser** | $0.10 per document (≤10 pages) | $10 | $100 | $500 | None for this processor |
| **Mindee** | Starter **$44/mo floor** (annual), ≈$0.044/page — [pricing](https://www.mindee.com/pricing) | **$44** | ~$116 (Pro) | Enterprise quote | None; 14-day trial |
| **Veryfi** | Free ≤100/mo, then a **$500/mo minimum commitment** | $0 | **$500** | **$500** | 100/mo |
| **Taggun** | Flat tiers $28 / $99 / $399 | $28 | $99 | $399 | None recurring |

**The curve breaks at the bottom, not the top — which is the opposite of the usual intuition.** Three vendors behave like normal pay-as-you-go cloud APIs and scale down gracefully: AWS Textract, Azure, and Google Document AI. Everything else has a floor. Veryfi is the sharpest cliff: free up to 100/month, then $500/month with nothing in between, so at 1,000 receipts you pay $500 for roughly $80 of usage. Mindee's $44 floor makes 100 receipts cost $0.44 each — about 80× the same 100 receipts through a vision model.

At Tabby's volumes the specialist APIs are cheap in absolute terms ($1–$50/month for the pay-as-you-go three) but still 2–10× the vision-model path, and the cheapest of them (Textract at $10 per 1,000) is roughly twice Claude Haiku 4.5 (~$5.50 per 1,000, §3).

## 1b. Vision models (including Claude)

This is the approach with the least integration friction for this specific codebase.

**Structured output is a first-class, guaranteed feature, not prompt-wrangling.** Claude offers two mechanisms that constrain the response to a schema ([Structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)):
- `output_config.format` with `type: "json_schema"` — constrained decoding guarantees schema-compliant JSON.
- `strict: true` on a tool definition — guarantees `tool_use.input` validates against `input_schema`.

Known limits: no numeric-range or string-length constraints, no recursive schemas, `additionalProperties` must be `false`, and the first use of a new schema adds grammar-compile latency (cached 24 h).

**There is an official PHP SDK** — `composer require anthropic-ai/sdk` — with `StructuredOutputModel` classes that map a PHP class with typed properties directly onto the schema, and `$message->parsedOutput()` returning a typed instance. For a Laravel app this is materially less integration work than hand-rolling a REST client against a receipt vendor, and it means the parse target can be a real PHP object with `string $description; int $quantity; int $unitPriceMinorUnits;` rather than an untyped array.

**Image token cost — the current formula.** Per [Anthropic's vision documentation](https://platform.claude.com/docs/en/build-with-claude/vision): "Claude views images in patches instead of pixels. Each patch is a 28×28-pixel block of the image, referred to as a visual token. An image, therefore, costs `⌈width / 28⌉ × ⌈height / 28⌉` visual tokens." Two tiers cap this regardless of the source resolution:

| Resolution tier | Models | Max long edge | Max visual tokens |
|---|---|---|---|
| High-resolution | Claude 4.7 and later | 2576 px | 4784 |
| Standard | All other models | 1568 px | 1568 |

(Note: the widely repeated `(width × height) / 750` rule is out of date. Do not use it.)

Other first-party limits worth knowing before writing the upload path: max 10 MB per image base64-encoded, max dimensions 8000×8000 px, formats JPEG/PNG/GIF/WebP only, and "Claude does not parse or receive any metadata from images passed to it" — so EXIF, including GPS, is not transmitted to the model.

Gemini 2.5 Flash ($0.30 in / $2.50 out per MTok, [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)) and GPT-5 mini ($0.25 / $2.00, [OpenAI pricing](https://developers.openai.com/api/docs/pricing)) are cheaper per token, but each uses a different image-tokenisation formula, so per-receipt cost is not comparable from the headline rate alone. Neither has a first-party PHP SDK.

## 1c. Self-hosted options

**Plain OCR engines are not a candidate.** Tesseract's own README lists its output formats as "plain text, hOCR, PDF, invisible-text-only PDF, TSV, ALTO, PAGE" ([tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract)) — text and geometry, no semantics. EasyOCR returns "bounding box, the text detected and confident level" ([JaidedAI/EasyOCR](https://github.com/JaidedAI/EasyOCR)). docTR returns a nested `Document > Page > Block > Line > Word` tree ([mindee/doctr](https://github.com/mindee/doctr)). None of them knows what a quantity is. Choosing one means writing the receipt layout parser yourself, which is the actual hard part.

**Donut is the best-evidenced self-hosted option and the numbers are still not good enough.** `naver-clova-ix/donut-base-finetuned-cord-v2` is a 143M-parameter OCR-free model with a published CORD score. From the [Donut paper](https://arxiv.org/abs/2111.15664), Table 2: **F1 = 84.1, TED-based accuracy = 90.9**, at 1.2 s/image measured on an NVIDIA P40 GPU. The paper defines the harsh metric precisely: "The F1 checks whether the extracted field information is in the ground truth. Even if a single character is missed, the score assumes the field extraction is failed." The shipped checkpoint's own reported test numbers in [clovaai/donut](https://github.com/clovaai/donut) are TED 0.9130 / F1 0.8406.

**CORD's schema does match what Tabby needs**, which makes that 84.1 meaningful rather than beside the point. [clovaai/cord](https://github.com/clovaai/cord) and the CORD paper (Park et al., NeurIPS 2019 Document Intelligence Workshop) document per-line fields including `menu.nm` (item name), `menu.cnt` ("quantity of menu"), and `menu.unitprice` ("unit price of menu"), across 8 superclasses and 54 subclasses — quantity and unit price are first-class ground truth.

**But CORD is 11,000 Indonesian receipts**, and no primary source — the Donut paper, the Donut repo, the LayoutLMv3 paper — publishes a CORD-finetuned accuracy figure on Western/US receipts. Out-of-domain accuracy for this checkpoint is **not established**. Expect degradation on different layouts, fonts, currency symbols, and tax/tip conventions; there is no published number to quantify it.

**LayoutLMv3's much better-looking 96.56 F1 is not a comparable number.** The [LayoutLMv3 paper](https://arxiv.org/abs/2204.08387) states: "We pre-processed document images with an off-the-shelf OCR toolkit to obtain textual content and corresponding 2D position information," and its CORD evaluation uses "officially-provided images and OCR annotations." It is token classification given ground-truth OCR, not end-to-end reading of a photo. Using it means: OCR engine, then LayoutLMv3, then your own code to reassemble labelled tokens into rows — three components instead of one — and Microsoft ships no official CORD checkpoint (only community fine-tunes).

**General open VLMs are worse at this specific task, and there is now a 2026 benchmark that says so.** ReceiptBench ([arXiv 2605.22413](https://arxiv.org/abs/2605.22413), "From Recognition to Reasoning: Benchmarking and Enhancing MLLMs on Real-World Receipt Document Understanding") measures a "structural parsing" sub-task that is exactly line-item extraction:

| Model | Overall F1 | Structural parsing (line items) F1 |
|---|---|---|
| Qwen3-VL-4B (baseline) | 0.6261 | 0.4909 |
| Qwen3-VL-8B (baseline) | 0.6545 | 0.4792 |
| Qwen3-VL-4B (SFT+GRPO fine-tuned) | 0.7788 | 0.6215 |
| Qwen3-VL-8B (SFT+GRPO fine-tuned) | 0.7950 | 0.6373 |

The paper's own conclusion: "the structural parsing task remains the persistent bottleneck across all baseline models." Reaching even 0.62 required supervised fine-tuning plus GRPO on a receipt-specific dataset — not something a hobby project does. Deployment-wise these are 7–8B models; olmOCR's card calls `.to("cuda")`, dots.ocr's recommends vLLM at `--gpu-memory-utilization 0.95`. CPU inference latency for any of them is **not established** by their model cards.

**Cost of self-hosting**, from [RunPod's pricing page](https://www.runpod.io/pricing) (Secure Cloud, checked 2026-08-28): RTX A5000 24 GB $0.27/hr, L4 $0.49/hr, RTX 3090 $0.50/hr, RTX 4090 $0.74/hr. Bursty spin-up/spin-down is cents per session; running one 24/7 is roughly $195–$540/month, which is far outside hobby scale and orders of magnitude above the hosted-API cost at these volumes. And in every case Laravel cannot call these models directly — it needs a Python sidecar (FastAPI or vLLM's server) as a second deployed service.

**Verdict on self-hosting: no.** It is more infrastructure, more code, a second runtime, worse measured accuracy on the exact sub-task that matters, and more money at Tabby's volume.

## 2. Accuracy on real receipts — the section that decides this

This is where the evidence is thinnest, and it is thin in a specific and important way.

### The benchmarks do not measure what Tabby needs

| Dataset | Does it have per-item quantity + unit price? | Source |
|---|---|---|
| **SROIE** (ICDAR 2019 Task 3) | **No.** Task 3 extracts four header-level fields only: company, date, address, total. It does not measure line items, quantities, or unit prices at all. | [ICDAR2019 competition paper, arXiv 2103.10213](https://arxiv.org/abs/2103.10213); [RRC challenge page](https://rrc.cvc.uab.es/?ch=13) |
| **CORD** | **Yes.** `menu.nm` (name), `menu.cnt` (quantity), `menu.unitprice` (unit price), `menu.price`, `menu.discountprice`, `menu.vatyn`, plus submenu variants — 30 hierarchical entities under `menu`, `subtotal`, `total`. | [clovaai/cord](https://github.com/clovaai/cord); CORD paper (Park et al., NeurIPS 2019 DI Workshop) |
| **ReceiptBench** (2026) | **No.** Its line-item schema is `{content, amount, ifTax}` — description plus a single amount. Quantity and unit price are collapsed. | [arXiv 2605.22413](https://arxiv.org/abs/2605.22413) |
| **WildReceipt** | Not established — 25 KIE categories, but whether quantity and unit price are distinct classes could not be confirmed from the paper. | [arXiv 2103.14470](https://arxiv.org/abs/2103.14470) |

So the most widely cited receipt benchmark (SROIE) is irrelevant to Tabby, and the newest LLM-specific one (ReceiptBench) does not test the quantity/unit-price split either. Any vendor or blog post citing "state of the art on SROIE" is citing a number about four header fields.

### Where numbers do exist, line items are the worst sub-task

ReceiptBench is the most directly relevant published evidence: 10,656 real-world receipt images, with a "structural parsing" sub-task for nested line items. Measured F1 on that sub-task:

| Model | Structural parsing (line items) F1 |
|---|---|
| GPT-5 | 0.4893 |
| Gemini-3-Pro | 0.5781 |
| Qwen3-VL-8B (baseline) | 0.4792 |
| Qwen3-VL-8B (after SFT + GRPO fine-tuning) | 0.6373 |

The paper's own words: "the structural parsing task remains the persistent bottleneck across all baseline models." No Claude model was evaluated in it.

For contrast, the BLOCKIE paper ([arXiv 2505.13535](https://arxiv.org/html/2505.13535)) reports Claude 3.5 Sonnet zero-shot at **91.37% F1 on CORD** — but that is aggregate entity-level F1 across all 30 hierarchical entities, blending easy header fields with hard per-item ones, on an older model, on Indonesian receipts. Its headline 98.83% is a *pipeline* number (OCR segmentation feeding the model), not "show a model a photo and ask for JSON."

### The honest answer

**There is no published, primary-source measurement of per-item quantity and unit-price extraction accuracy, separated from tax and tip, on real-world phone photos of receipts, for any current frontier model.** This was searched across CORD, SROIE, WildReceipt, ReceiptBench, BLOCKIE, OCRBench and OmniDocBench. It is not established. Anyone who quotes you a percentage for this is extrapolating.

Anthropic's own vision documentation adds a first-party caveat pointing the same direction: Claude "might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images" ([Vision docs, Limitations](https://platform.claude.com/docs/en/build-with-claude/vision)) — which describes a photo of a curled thermal receipt taken across a restaurant table.

**What this means for the decision:** the accuracy of the one thing Tabby depends on cannot be established from documentation. It can only be established by building a small eval — 30–50 real receipts from the actual target market, hand-labelled with quantity and unit price, scored against a candidate. That eval is a day or two of work and it is a *prerequisite* to committing the feature, not a follow-up to it.

## 3. Cost per receipt

### The vision-model path

Anthropic publishes a worked cost example on its own [vision docs](https://platform.claude.com/docs/en/build-with-claude/vision): "at Claude Haiku 4.5's $1 USD per million input tokens (standard tier), the 1000×1000 image costs about $1.30 USD per thousand images. At Claude Opus 5's $5 USD per million (high-resolution tier), the same image costs about $6.48 USD per thousand and the 4K image about $23.92 USD per thousand."

Extending that to a realistic receipt request — a tall image downscaled client-side to the tier ceiling, plus a ~400-token prompt and schema, plus ~700 output tokens for a 14-line-item JSON — gives the following. **These totals are computed by me from the published formula and the published per-token rates, not quoted from a vendor:**

| Model | Rate (in / out per MTok) | Image tokens | Est. cost / receipt | 100/mo | 1,000/mo | 5,000/mo |
|---|---|---|---|---|---|---|
| Claude Haiku 4.5 | $1 / $5 | ~1,568 (standard tier cap) | **~$0.0055** | $0.55 | $5.50 | $27.50 |
| Claude Sonnet 5 | $2 / $10 | ~1,792 | ~$0.011 | $1.14 | $11.40 | $57 |
| Claude Opus 5 | $5 / $25 | ~4,784 (high-res cap) | ~$0.043 | $4.30 | $43 | $215 |

Rates from [platform.claude.com/docs/en/models/overview](https://platform.claude.com/docs/en/models/overview).

**The cost curve does not break anywhere in Tabby's plausible range.** At 5,000 receipts a month on the cheapest capable model this is under $30. Cost is not the constraint on this feature. That is the single most useful thing to know, because it removes the argument people usually reach for and forces the decision onto accuracy and scope, where it belongs.

Two levers matter if it is ever built: **downscale on the client before upload** (a 12 MP phone photo and a 1568-px-long-edge JPEG cost the same tokens after the tier cap, but the smaller one uploads faster and costs less bandwidth), and **use the smallest model that passes the eval**, not the largest — an 8× cost spread sits between Haiku and Opus here.
## 4. Integration shape in Laravel 13

### What the repo actually is today

This matters more than any latency number. As of `main` at 18e8786, Tabby is an unmodified `laravel/vue-starter-kit`:

- `routes/web.php` contains only `/`, `/dashboard`, and the Fortify settings routes. There is no `Group`, `Expense`, `LineItem`, `Claim`, `Adjustment`, or `Participant` — not a model, not a migration, not a route.
- `app/Models/` contains one file: `User.php`.
- `database/migrations/` contains only the framework's own tables (users, cache, jobs, passkeys, 2FA columns).

So receipt OCR would be a feature attached to an expense-entry flow that does not exist yet. Every integration question below is downstream of building the core first.

### Installed capability, verified from the repo

| Capability | State | Evidence |
|---|---|---|
| Queue | `database` driver | `.env.example`: `QUEUE_CONNECTION=database` |
| `jobs`, `job_batches`, `failed_jobs` tables | Already migrated | `database/migrations/0001_01_01_000002_create_jobs_table.php` |
| Horizon / Redis | Not installed | `composer.json` |
| Broadcasting (Reverb, Pusher, Echo) | Not installed | `composer.json`, `package.json` |
| Filesystem | `local` disk; S3 configured but unused | `.env.example`: `FILESYSTEM_DISK=local`; `config/filesystems.php` |
| Inertia | v3 (`inertiajs/inertia-laravel ^3.0`, `@inertiajs/vue3 ^3.0.0`) | `composer.json`, `package.json` |
| Anthropic PHP SDK | Not installed, but exists: `composer require anthropic-ai/sdk` | official PHP SDK, with `StructuredOutputModel` classes for typed JSON output |

The absence of broadcasting is the load-bearing detail. With no websocket transport installed, a queued job cannot push its result to the page. The Inertia-native option is [`usePoll`](https://inertiajs.com/docs/v3/data-props/polling) (`usePoll(2000, {only: ['receipt']}, {mode: 'rest'})`), or a [deferred prop](https://inertiajs.com/docs/v3/data-props/deferred-props) with a skeleton fallback. Both work; both are polling.

### Synchronous vs queued

The ticket frames this correctly: "a 30-second wait is a different product from a 2-second one."

- **Synchronous** (request thread calls the vendor, returns the parsed items in the same response) keeps the Organizer in one flow and needs no queue worker, no polling, no job state machine. It costs one blocked PHP-FPM worker for the duration and puts the vendor's latency directly on the request. Any vendor timeout becomes a 500 or a spinner that never resolves.
- **Queued** (`ShouldQueue` job, `#[Backoff([1, 5, 10])]`, `failed()` handler writing a terminal status the page can poll) is the correct shape for anything above a couple of seconds, and Laravel 13 supports it out of the box here. But it costs: a `receipt_scans` table or equivalent to hold status, a polling endpoint, a running `queue:work` process the hobby deploy must supervise, and a UI that has three states instead of one.

Actual end-to-end latency for a receipt-sized vision request is **not established** from a primary source — Anthropic does not publish per-request latency figures, and neither do the receipt-API vendors in the terms they publish. It has to be measured, not looked up. That is itself a finding: you cannot pick sync-vs-queued from documentation, only from a prototype.

### File handling

Laravel 13's fluent file rules cover the upload validation:

```php
'receipt' => ['required', File::image()->max('10mb')],
```

`File::image()` rejects SVG by default (`allowSvg: true` opts in) — [Validation docs](https://github.com/laravel/docs/blob/13.x/validation.md). Note the Claude API's own cap is 10 MB base64-encoded per image, and the max dimension is 8000×8000 px ([Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)), so a modern phone photo needs downscaling before it is sent — which is also the single biggest cost lever (see §3).

Storage raises a question the map has to answer regardless of vendor: **does Tabby keep the receipt image after parsing?** Keeping it means Tabby is now storing photographs containing card fragments and merchant data on a `local` disk with no retention policy, which is strictly worse for privacy than the vendor call itself. Discarding it means a failed parse cannot be retried or audited. This is a design decision, not a technical one, and it is easy to miss.

### The failure path — the part that decides the feature

Parsing does not fail loudly. It fails by returning a plausible, well-formed, wrong item list: a merged line, a quantity read as `11` instead of `1`, a discount line captured as an item, a tip folded into the subtotal. Given Tabby's model, the consequences are specific:

- Tabby's **Share** semantics mean a Line Item's cost divides by total Shares claimed, and quantity is "a completeness check, not a cap" (CONTEXT.md). So a wrong *quantity* does not corrupt the money — it corrupts the completeness signal.
- A wrong *unit price* does corrupt the money, silently, and it propagates into every Balance in the Group.
- A tax or service line mis-parsed as a Line Item is worse still: in Tabby's model an **Adjustment** is allocated evenly or pro-rata across claimers, whereas a Line Item must be *claimed* by someone. A tax line that arrives as a Line Item will sit unclaimed and its cost will be silently unallocated — or claimed by whoever taps it, which is wrong for everyone.
- Because Balances are derived and never frozen ([ADR 0001](../adr/0001-balances-are-derived-never-stored.md)), a bad number found on day 4 is repairable — but only by the Organizer, who is the only role that can mutate the ledger.

Therefore the only defensible integration shape is **OCR as a draft, never as a commit**: the parse populates an editable form the Organizer confirms line by line before anything is persisted as an Expense. This is not a nice-to-have safeguard; it is the design. And it substantially reduces the feature's value proposition, because the Organizer still has to read and verify 14 lines — the saving is typing, not attention.
## 5. Privacy

### What Tabby is protecting

CONTEXT.md defines a **Participant** as "a named person who owes or is owed money within one Group [...] holds no account and no contact details". The PII-free property is a property of Tabby's *schema*, not of its *inputs*. A receipt photo is uncontrolled content: it routinely carries the last four digits of a payment card, a cardholder name, a merchant name and street address, a precise timestamp, a loyalty or member number, a server's name, a table number, and whatever else was in frame when the Organizer took the photo. Sending one to a vendor is therefore a real step up in exposure regardless of how sparse the `participants` table is — the design property does not travel with the image.

Two obligations follow and they are independent of vendor choice:

1. **The Organizer consents, the Participants cannot.** The Organizer took the photo and pressed the button. The other diners on the receipt did not, and Tabby has no channel to ask them — by design, they have no contact details. Any third-party OCR is a decision the Organizer makes on behalf of people who never agreed to it.
2. **Disclosure has to be at the point of upload,** not in a privacy policy, because that is the only moment the Organizer can decline.

### Anthropic (Claude API) — verified

| Question | Finding | Source |
|---|---|---|
| Training on inputs | "Anthropic may not train models on Customer Content from Services." | [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms), Section B |
| Training on images specifically | "Anthropic does not use uploaded images to train models." | [Vision docs, FAQ](https://platform.claude.com/docs/en/build-with-claude/vision) |
| Image storage | "Image uploads are ephemeral and not stored beyond the duration of the API request. Uploaded images are automatically deleted after they have been processed." | [Vision docs, FAQ](https://platform.claude.com/docs/en/build-with-claude/vision) |
| Default retention (inputs/outputs generally) | "we automatically delete inputs and outputs on our backend within 30 days of receipt or generation" | [Privacy Center — how long do you store personal data](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data) |
| Zero data retention | Available "through negotiated agreements" — i.e. not a self-serve toggle | same |
| Trust & safety exception | Content violating the Usage Policy is retained "for up to 2 years and trust and safety classification scores for up to 7 years" | same |
| Ownership | "Customer (a) retains all rights to its Inputs, and (b) owns its Outputs." | [Commercial Terms](https://www.anthropic.com/legal/commercial-terms), Section B |

Note the tension between rows 3 and 4: the vision FAQ says image uploads are ephemeral, while the general retention article states a 30-day backend window for inputs and outputs. The conservative reading for a spec is **assume up to 30 days**, because the 30-day statement is the one that appears in the retention policy proper.

### Other vendors — verified terms

| Vendor | Trains on submitted content by default? | Vendor-side human review? | Retention |
|---|---|---|---|
| **Anthropic API** | No — "By default, we will not use your inputs or outputs from our commercial products (e.g. Claude for Work, Anthropic API...) to train our models" | Only for content flagged by safety classifiers | 30 days default; ZDR exists but "contact the Anthropic sales team" |
| **Google Cloud Document AI** | No — "we never use customer data to train our Document AI models" | No — HITL feature deprecated 16 Jan 2024 | Batch: deleted after processing, 1-day failsafe TTL. Sync: "processed in memory... not persisted to disk" |
| **Mindee** | No — "all documents are the property of their organization and are not used for training Mindee models" | Not established | "The original uploaded file is never stored to disk"; extracted data 12h default (1–24h configurable); zero-retention option "available on all plans" |
| **Azure AI Document Intelligence** | **Not established** — no first-party clause found either way | None documented | Fixed 24h, early deletion via Delete Analyze Result API |
| **AWS Textract** | **Yes** — "may store and use document and image inputs... to improve and develop the quality of Amazon Textract and other Amazon machine-learning/artificial-intelligence technologies". Opt-out is a free, self-serve AWS Organizations policy | Not by default; optional A2I integration can route to **Mechanical Turk's public workforce** if misconfigured | 7 days for async; sync results not stored |
| **Veryfi** | **Yes** — "We may use data you submit, which can include personal data contained in your documents, to train, validate, and improve our proprietary machine learning models." Opt-out only "through their agreement, DPA, or product configuration" for business customers | No — "NO Human-in-the-loop... 100% machines end-to-end" (applies to extraction only, not to the training use above) | No fixed period; "as long as you want Veryfi to function for you" |
| **Gemini API, unpaid tier** | **Yes** — "Google uses the content you submit... to provide, improve, and develop Google products and services and machine learning technologies" (EEA/CH/UK carved out) | **Yes, explicitly** — "human reviewers may read, annotate, and process your API input and output" | Not specified |
| **Gemini API, paid tier** | No — "Google doesn't use your prompts (including... images...) or responses to improve our products" | Not excluded in the text — unconfirmed | "a limited period of time" — duration unspecified |
| **Taggun** | Not established (silent) | No — "only automated, machine-based processing" | Fixed 3-year maximum, not configurable |
| **Klippa / Doxis** | Yes, for "anonymized" data | Not established | Configurable in platform settings |

Notes on the last two rows: Klippa rebranded to Doxis in March 2026 and its legal pages redirect or 404, so its terms could not be verified. Taggun's ToS frames it as the customer's "agent" under NZ privacy law rather than making a GDPR-processor commitment.

### Privacy verdict

**No vendor's terms make receipt OCR impossible, but three specific defaults are traps**, and two of them are on the vendors a hobby project would most plausibly reach for:

1. **Veryfi trains on submitted personal data by default** and the opt-out is contractual, not a setting — likely unavailable without a business agreement. That is a direct conflict with Tabby's design intent.
2. **AWS Textract trains by default** unless an AWS Organizations opt-out policy is configured *before first use*. The opt-out is free and self-serve, but it is a step that is easy to never take.
3. **Gemini's unpaid tier both trains on content and explicitly permits human reviewers to read inputs and outputs.** For a hobby project reaching for a free tier, this is the worst available outcome, and it is the tier a hobby project is most likely to pick.

The cleanest postures are **Google Cloud Document AI** (no training, effectively no retention), **Mindee** (no training, zero-retention on every plan), and **Anthropic** (no training on commercial products; 30-day retention; ephemeral image handling).

But none of that resolves the obligation identified above: the Participants on the receipt did not consent and cannot be asked. The vendor terms determine how bad a leak would be; they do not determine whether asking was required. **Any implementation must disclose the third party at the upload control, and must offer manual entry as a first-class path rather than a fallback.** That is a product requirement, not a legal one.

## What could not be established

Listed explicitly rather than papered over:

- **Per-item quantity and unit-price extraction accuracy, separated from tax/tip/service, on real-world phone photos**, for any current model or vendor. This is the central missing fact and it is why the recommendation is what it is.
- **End-to-end latency** for a receipt-sized vision request, or for any of the receipt APIs. Anthropic publishes only qualitative latency tiers; the vendors publish none. Sync-vs-queued cannot be chosen from documentation.
- **Azure prebuilt-receipt per-page price** — the pricing page renders `$-` placeholders rather than figures.
- **Whether Azure Document Intelligence trains on submitted input.** No first-party clause was found either way; the 24-hour retention window mitigates but does not answer it.
- **Out-of-domain accuracy for CORD-finetuned models** (i.e. Donut on non-Indonesian receipts). No published number exists.
- **Whether Gemini's paid tier excludes human review.** Its terms exclude training but are silent on review; the explicit human-review clause appears only under Unpaid Services.
- **Klippa/Doxis terms and pricing** — legal pages redirect or 404 mid-rebrand.
- **Mindee's retention behaviour** shows a discrepancy between its docs (12 h default, zero-retention option on all plans) and its DPA (7 days for async APIs). Not resolved.
