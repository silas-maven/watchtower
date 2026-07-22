# Feedback Item 003 — Live portfolio, allocation, reports, generated averaging plans

Source: WhatsApp voice note transcription provided inline by Hermes
Captured: 2026-06-16
Type: Voice note

## Transcript

“So they are better just like a pie chart that just shows what you hold and then also a portfolio and use summary that just basically gives you a summary. So if he had like, say, 10 stocks, you just have to scroll down to see more. And then when you hit a few detailed report, it would give you like a very detailed one-pager for each stock or something like that. So I'm just really trying to, if you go on trading two, one, two, it has stuff like this, but it's not, there's a lot missing. So I want this to really capture the SPH strategy, like the things we should care about, like, what is my portfolio of beta, what is my next buy price on the stocks that we hold. And then obviously the next phase will be to switch on alerts. So people will just automatically get an alert if their next buy price get hit or the sell price gets hit. But yeah, the key thing is right now they should be able to see their life portfolio and all this should be in the virtual portfolio as well. And yeah, this is actually quite good because people can use the virtual portfolio a bit easier now. And then also the fact that when you click on any asset, you can get that asset page as well. And then on the other side, you can click and you can get your average in plan. It could be that they can then be a way for me to set up some logic so that eventually people can do their own. They won't need to keep coming to me for average in plan. The system will generate it. And I know the default is like 50% and then people ask me and then I tweak it and stuff like that. But eventually, I want, this is more stuff I need to do behind the scenes, but I want to make sure that there's less of those questions coming in. So for example, behind the scenes, I want there to be logic in place where if someone has 10k, then I can write like the algorithm will generate what an average in plan looks like if you've got a 3k, a 4k, a 5k, a 10k, or whatever budget. So there'll be a page where each user can kind of they need to fill out something that says how busy they are and so on and so forth. But that's the next phase where that's the next phase. The first phase is just moving away from Google Sheets and having your personal blotter watchlist on a web app like this that they can log in to to get access. And when they log in, they need to put their phone number, their name and their email address and so on and so forth so that it becomes easy for me to revert access.”

## Normalised interpretation

- Live Portfolio should include a pie/donut chart showing what the user holds.
- Portfolio summary should show high-level metrics at a glance.
- If a user has many stocks, the holdings list can scroll.
- “View Detailed Report” should generate/open a detailed one-pager for each stock.
- The product should capture the Spartan/SPH strategy specifically, not just generic broker portfolio features.
- Important Spartan strategy metrics include:
  - portfolio beta,
  - next buy price for held stocks,
  - sell price / sell target,
  - averaging plan state.
- Next phase: alerts when next buy price or sell price is hit.
- Live Portfolio functionality should also exist for the Virtual Portfolio.
- Clicking an asset should open that asset’s library/details page.
- Clicking an averaging plan should open that plan.
- Longer-term direction: system-generated averaging plans so users do not need to repeatedly request manual plans.
- Generated plans should adapt to budget sizes such as £3k, £4k, £5k, £10k, etc.
- Future onboarding/preferences may ask users how busy they are / what kind of plan they can follow.
- Phase 1 is not full automation; it is moving away from Google Sheets into a web app with personal blotter/watchlist access.
- Login/access should collect user phone number, name, email, etc., so access can be managed/revoked easily.

## Implementation notes

- Treat “life portfolio” as “live portfolio”.
- Treat “average in plan” / “average implant” as “averaging plan”.
- Treat “Trading two, one, two” as Trading 212.
- “SPH strategy” likely refers to Spartan strategy; keep exact wording visible where useful but implement as Spartan strategy unless Kyser says otherwise.
