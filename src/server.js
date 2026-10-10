require('dotenv').config();

const express  = require('express');
const path     = require('path');
const Groq     = require('groq-sdk');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── POST /api/roadmap ──
app.post('/api/roadmap', async (req, res) => {

  // 1. Check API key is configured
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: 'AI service is not configured. Please add your GROQ_API_KEY to the .env file and restart the server.'
    });
  }

  // 2. Validate incoming fields
  const { name, career, skills, level } = req.body;

  if (!career || typeof career !== 'string' || career.trim().length === 0) {
    return res.status(400).json({ error: 'Target career is required.' });
  }
  if (!skills || typeof skills !== 'string' || skills.trim().length === 0) {
    return res.status(400).json({ error: 'Current skills are required.' });
  }
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  if (!level || !validLevels.includes(level)) {
    return res.status(400).json({ error: 'Experience level must be beginner, intermediate, or advanced.' });
  }
  if (career.trim().length > 100) {
    return res.status(400).json({ error: 'Target career must be 100 characters or fewer.' });
  }
  if (skills.trim().length > 500) {
    return res.status(400).json({ error: 'Current skills must be 500 characters or fewer.' });
  }

  // 3. Build the prompt
  const safeName = (name && name.trim()) ? name.trim() : 'the student';

  const prompt = `
You are an expert career coach. Generate a personalised career roadmap for ${safeName}.

Details:
- Target career: ${career.trim()}
- Current skills: ${skills.trim()}
- Experience level: ${level}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "steps": [
    {
      "title": "Step title",
      "description": "2–3 sentence explanation specific to this person's career and skills.",
      "resources": "1–2 specific courses, tools, or websites relevant to this step.",
      "tag": "Suggested timeframe, e.g. Month 1–2"
    }
  ]
}

Rules:
- Produce exactly 5 steps.
- Make each step genuinely specific to the target career "${career.trim()}" and the skills "${skills.trim()}".
- Tailor the difficulty and pace to a ${level}-level learner.
- Include real, named learning resources (e.g. "Coursera Machine Learning Specialisation by Andrew Ng", "freeCodeCamp Responsive Web Design", "TryHackMe for cybersecurity").
- Do not use generic advice that could apply to any career.
`.trim();

  // 4. Call the Groq API
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const raw = completion.choices[0].message.content.trim();

    // 5. Parse and validate the JSON response
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('OpenAI returned non-JSON:', raw);
      return res.status(500).json({ error: 'The AI returned an unexpected format. Please try again.' });
    }

    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return res.status(500).json({ error: 'The AI response was missing steps. Please try again.' });
    }

    return res.json({ steps: parsed.steps });

  } catch (err) {
    console.error('Groq API error:', err.message);

    if (err.status === 429 ||
        err.status === 402 ||
        err.message?.includes('quota') ||
        err.message?.includes('rate_limit')) {
      console.log('Falling back to demo steps due to Groq rate limit.');
      const steps = buildDemoSteps(career.trim(), skills.trim(), level);
      return res.json({ steps, fallback: true });
    }

    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid Groq API key. Please check your .env file.' });
    }

    return res.status(500).json({ error: 'Something went wrong while contacting the AI. Please try again.' });
  }
});

// ── POST /api/roadmap/demo ──
// Returns career-relevant steps without any API key.
// Steps are clearly labelled as demo content — never as AI-generated.
app.post('/api/roadmap/demo', (req, res) => {
  const { career = '', skills = '', level = 'beginner' } = req.body;

  if (!career.trim()) {
    return res.status(400).json({ error: 'Target career is required.' });
  }

  const steps = buildDemoSteps(career.trim(), skills.trim(), level);
  return res.json({ steps, demo: true });
});

// ── Demo step builder ──
// Matches the career string against known domains and picks the best fit.
// Falls back to general steps if no domain matches.
function buildDemoSteps(career, skills, level) {
  const c = career.toLowerCase();

  // ── Domain definitions ──
  const domains = [
    {
      match: ['data scientist', 'data science', 'machine learning', 'ml engineer', 'ai engineer'],
      steps: {
        beginner: [
          { title: 'Python & Statistics Foundations',
            description: `As someone starting out in Data Science, your first focus should be Python programming and basic statistics. These are the non-negotiable building blocks — every data science workflow depends on them.`,
            resources: 'Python for Everybody (Coursera, University of Michigan) · Khan Academy Statistics',
            tag: 'Month 1–2' },
          { title: 'Data Wrangling with Pandas & NumPy',
            description: 'Learn to load, clean, and explore real datasets using Pandas and NumPy. Practice on free datasets from Kaggle or the UCI Machine Learning Repository.',
            resources: 'Kaggle Pandas micro-course (free) · "Python Data Science Handbook" by Jake VanderPlas (free online)',
            tag: 'Month 2–3' },
          { title: 'Data Visualisation',
            description: 'Build charts and graphs that tell a story. Matplotlib and Seaborn are the standard libraries — learn to make bar charts, scatter plots, and heatmaps.',
            resources: 'freeCodeCamp Data Analysis with Python · Seaborn official tutorial',
            tag: 'Month 3–4' },
          { title: 'Intro to Machine Learning',
            description: 'Learn the core ML algorithms — linear regression, decision trees, and k-nearest neighbours — using scikit-learn. Build and evaluate your first predictive model.',
            resources: 'Coursera Machine Learning Specialisation by Andrew Ng · scikit-learn documentation',
            tag: 'Month 4–6' },
          { title: 'First End-to-End Project',
            description: 'Pick a real-world problem (e.g. predicting house prices), go through the full pipeline from raw data to a deployed result, and publish it on GitHub with a clear README.',
            resources: 'Kaggle competitions (start with Titanic) · GitHub for version control',
            tag: 'Month 6–7' },
        ],
        intermediate: [
          { title: 'Close Your Skill Gaps',
            description: `Review job postings for Data Scientist roles and note which skills appear most often that you don't yet have. Based on your current skills (${skills || 'as listed'}), prioritise SQL, feature engineering, or model evaluation if any are missing.`,
            resources: 'Mode Analytics SQL Tutorial · Kaggle Feature Engineering course',
            tag: 'Week 1–2' },
          { title: 'Advanced ML & Model Evaluation',
            description: 'Go beyond accuracy — learn cross-validation, ROC curves, precision/recall, and hyperparameter tuning. Understand when to use ensemble methods like Random Forest and XGBoost.',
            resources: 'fast.ai Practical Deep Learning (free) · "Hands-On Machine Learning" by Aurélien Géron',
            tag: 'Month 1–3' },
          { title: 'SQL & Data Engineering Basics',
            description: 'Data scientists spend a large portion of their time querying databases. Build confidence with joins, window functions, and CTEs in SQL.',
            resources: 'SQLZoo (free, interactive) · Mode Analytics SQL Tutorial',
            tag: 'Month 2–3' },
          { title: 'Build a Portfolio-Worthy Project',
            description: 'Create a project that solves a real business problem — not just a tutorial. Write a clear case study documenting your process, results, and what you learned.',
            resources: 'Kaggle datasets · Streamlit for building interactive data apps',
            tag: 'Month 3–5' },
          { title: 'Certify & Apply',
            description: 'Obtain a recognised certification to validate your skills, then start applying to data scientist or analyst roles with your polished portfolio.',
            resources: 'IBM Data Science Professional Certificate (Coursera) · Google Data Analytics Certificate',
            tag: 'Month 5–6' },
        ],
        advanced: [
          { title: 'Pick a Deep Specialisation',
            description: 'Choose a niche within Data Science — NLP, computer vision, MLOps, or time-series forecasting — and go deep. Specialisations command higher salaries and clearer career paths.',
            resources: 'Hugging Face NLP course (free) · Full Stack Deep Learning (free)',
            tag: 'Month 1' },
          { title: 'MLOps & Production Systems',
            description: 'Learn to deploy, monitor, and retrain models in production. Understand Docker, CI/CD pipelines, and model versioning with tools like MLflow.',
            resources: 'Made With ML (free MLOps course) · AWS SageMaker documentation',
            tag: 'Month 1–3' },
          { title: 'Research & Thought Leadership',
            description: 'Read and implement recent papers from arXiv. Write blog posts about your findings on Medium or Towards Data Science to build visibility.',
            resources: 'arXiv.org (cs.LG section) · Towards Data Science (Medium publication)',
            tag: 'Month 2–4' },
          { title: 'Lead a Cross-Functional Project',
            description: 'Propose and lead a data science initiative that involves stakeholders outside your team — product, marketing, or engineering. This is what distinguishes senior from mid-level.',
            resources: 'Internal company data or open government datasets',
            tag: 'Month 3–5' },
          { title: 'Senior Roles & Negotiation',
            description: 'Target Staff Data Scientist or Lead ML Engineer positions. Prepare for system design interviews and salary negotiations using current market data.',
            resources: 'Glassdoor & Levels.fyi for salary data · "Cracking the ML Interview" resources on GitHub',
            tag: 'Month 5–6' },
        ],
      },
    },
    {
      match: ['web developer', 'frontend', 'front-end', 'back-end', 'backend', 'full stack', 'fullstack', 'software engineer', 'software developer'],
      steps: {
        beginner: [
          { title: 'HTML, CSS & JavaScript Basics',
            description: 'Every web developer starts here. Learn to build and style web pages with HTML and CSS, then add interactivity with JavaScript.',
            resources: 'freeCodeCamp Responsive Web Design (free) · The Odin Project (free, project-based)',
            tag: 'Month 1–2' },
          { title: 'JavaScript Deep Dive',
            description: 'Move beyond the basics — understand DOM manipulation, async/await, fetch API, and ES6+ features. These are used in every modern web project.',
            resources: 'javascript.info (free, comprehensive) · freeCodeCamp JavaScript Algorithms & Data Structures',
            tag: 'Month 2–4' },
          { title: 'Learn a Frontend Framework',
            description: 'React is the most in-demand frontend framework. Learn components, props, state, and hooks by building small applications.',
            resources: 'React official tutorial (react.dev) · Scrimba React course (free tier)',
            tag: 'Month 4–5' },
          { title: 'Version Control with Git & GitHub',
            description: 'Every professional developer uses Git daily. Learn to commit, branch, merge, and open pull requests. Host your projects on GitHub.',
            resources: 'GitHub Skills (free, interactive) · "Pro Git" book (free online)',
            tag: 'Month 3–4 (in parallel)' },
          { title: 'Build & Deploy a Portfolio Site',
            description: 'Build a personal portfolio site that showcases 2–3 of your best projects. Deploy it for free using GitHub Pages or Netlify.',
            resources: 'Netlify (free hosting) · Vercel (free hosting for frontend projects)',
            tag: 'Month 5–6' },
        ],
        intermediate: [
          { title: 'Master Your Chosen Stack',
            description: `Identify the stack used most in jobs you want (e.g. React + Node, Vue + Django) and build at least two complete applications with it, drawing on your existing skills (${skills || 'as listed'}).`,
            resources: 'Full Stack Open (free, University of Helsinki) · Traversy Media YouTube channel',
            tag: 'Month 1–2' },
          { title: 'Testing & Code Quality',
            description: 'Learn unit testing, integration testing, and basic CI/CD. Employers value engineers who write reliable, maintainable code.',
            resources: 'Vitest / Jest documentation · Testing Library docs',
            tag: 'Month 2–3' },
          { title: 'Databases & APIs',
            description: 'Build and consume REST APIs. Learn SQL basics and how to connect a backend to a database (PostgreSQL or MySQL).',
            resources: 'SQLZoo (free) · REST API Tutorial (restapitutorial.com)',
            tag: 'Month 2–4' },
          { title: 'Cloud Deployment & DevOps Basics',
            description: 'Deploy an application to a real cloud platform. Understand environment variables, build pipelines, and basic infrastructure.',
            resources: 'AWS Free Tier · Render.com (easy free deployment)',
            tag: 'Month 4–5' },
          { title: 'Apply & Interview Prep',
            description: 'Practise common frontend/backend interview questions, data structures, and system design basics. Update your GitHub with clean, documented projects.',
            resources: 'LeetCode (easy/medium problems) · Frontend Interview Handbook (frontendinterviewhandbook.com)',
            tag: 'Month 5–6' },
        ],
        advanced: [
          { title: 'System Design Mastery',
            description: 'Study how large-scale web systems are architected — load balancing, caching, databases at scale, and microservices. This is the core of senior engineering interviews.',
            resources: '"Designing Data-Intensive Applications" by Martin Kleppmann · System Design Primer (GitHub)',
            tag: 'Month 1–2' },
          { title: 'Performance & Accessibility',
            description: 'Learn to profile and optimise web applications. Understand Core Web Vitals, lazy loading, and WCAG accessibility standards.',
            resources: 'web.dev (Google) · axe DevTools browser extension',
            tag: 'Month 2–3' },
          { title: 'Open Source Contributions',
            description: 'Contribute to a well-known open source project. This demonstrates senior-level collaboration skills and builds public reputation.',
            resources: 'Good First Issue (goodfirstissue.dev) · GitHub trending repositories',
            tag: 'Month 2–4' },
          { title: 'Technical Leadership',
            description: 'Mentor junior developers, lead code reviews, and write architecture decision records (ADRs). Soft skills at this level are as important as technical ones.',
            resources: '"The Staff Engineer\'s Path" by Tanya Reilly · LeadDev conference talks (YouTube)',
            tag: 'Month 3–5' },
          { title: 'Senior / Staff Role Applications',
            description: 'Target staff or senior engineer roles. Prepare a narrative around impact, not just features shipped. Use Levels.fyi to benchmark your salary expectations.',
            resources: 'Levels.fyi · interviewing.io for mock interviews',
            tag: 'Month 5–6' },
        ],
      },
    },
    {
      match: ['ux', 'ui designer', 'ux designer', 'product designer', 'interaction designer', 'ui/ux'],
      steps: {
        beginner: [
          { title: 'Design Foundations',
            description: 'Study the core principles of visual design — typography, colour theory, layout, and spacing. These apply to every screen you will ever design.',
            resources: 'Google UX Design Certificate (Coursera, free to audit) · "The Design of Everyday Things" by Don Norman',
            tag: 'Month 1–2' },
          { title: 'Learn Figma',
            description: 'Figma is the industry-standard design tool. Learn frames, components, auto-layout, and prototyping. The free plan is fully featured for learners.',
            resources: 'Figma official tutorials (help.figma.com) · Figma for Beginners playlist on YouTube',
            tag: 'Month 1–3' },
          { title: 'UX Research Basics',
            description: 'Understand how to conduct user interviews, usability tests, and create personas. Good design starts with understanding real users.',
            resources: 'Nielsen Norman Group articles (free) · Google UX Design Certificate module on research',
            tag: 'Month 2–4' },
          { title: 'Design a Case Study Project',
            description: 'Pick a real app or problem and redesign it end-to-end: research → wireframes → high-fidelity mockups → prototype. Document every decision.',
            resources: 'Mobbin (design reference) · Dribbble and Behance for inspiration',
            tag: 'Month 4–5' },
          { title: 'Build a Portfolio',
            description: 'Present 2–3 case studies on a personal portfolio site. The narrative and process matter as much as the visual output.',
            resources: 'Framer Sites (free portfolio hosting) · UXfolio',
            tag: 'Month 5–6' },
        ],
        intermediate: [
          { title: 'Advanced Figma & Design Systems',
            description: `Deepen your Figma skills with variables, component libraries, and design tokens. Building on your skills (${skills || 'as listed'}), create a reusable design system for your portfolio project.`,
            resources: 'Figma Config talks on YouTube · "Atomic Design" by Brad Frost (free online)',
            tag: 'Month 1–2' },
          { title: 'Accessibility & Inclusive Design',
            description: 'Learn WCAG 2.1 guidelines and how to design for users with disabilities. Accessibility is increasingly a hiring requirement.',
            resources: 'Deque University (free courses) · A11Y Project (a11yproject.com)',
            tag: 'Month 2–3' },
          { title: 'Quantitative UX & Analytics',
            description: 'Learn to use analytics data (Google Analytics, Hotjar) to support design decisions alongside qualitative research.',
            resources: 'Google Analytics Academy (free) · Hotjar free plan',
            tag: 'Month 2–4' },
          { title: 'Cross-Functional Collaboration',
            description: 'Practice working with engineers and product managers. Learn to write clear design specs and participate in agile ceremonies.',
            resources: 'Figma Dev Mode · "Shape Up" by Ryan Singer (free online)',
            tag: 'Month 3–5' },
          { title: 'Mid-Level Job Applications',
            description: 'Apply for mid-level UX/UI designer roles. Tailor your portfolio to the type of company (startup vs enterprise) and practice design critique presentations.',
            resources: 'LinkedIn Jobs · UX Collective articles on job hunting',
            tag: 'Month 5–6' },
        ],
        advanced: [
          { title: 'Strategic Design & Product Thinking',
            description: 'Move from executing tasks to shaping product direction. Learn jobs-to-be-done theory, OKRs, and how to connect design decisions to business outcomes.',
            resources: '"Continuous Discovery Habits" by Teresa Torres · Reforge programmes',
            tag: 'Month 1–2' },
          { title: 'Design Leadership & Mentorship',
            description: 'Lead design reviews, establish team-wide standards, and mentor junior designers. Influence without authority is a core senior skill.',
            resources: 'LeadingDesign conference talks (YouTube) · "The Making of a Manager" by Julie Zhuo',
            tag: 'Month 2–4' },
          { title: 'Measure Design Impact',
            description: 'Define and track metrics that show the business value of your design work — conversion rates, task completion, NPS changes.',
            resources: 'Nielsen Norman Group ROI of UX articles · Amplitude (product analytics)',
            tag: 'Month 3–4' },
          { title: 'Publish Your Thinking',
            description: 'Write articles about your design process and decisions on Medium or your own site. Thought leadership accelerates senior opportunities.',
            resources: 'UX Collective on Medium · Substack for independent newsletters',
            tag: 'Month 3–5' },
          { title: 'Principal / Lead Designer Roles',
            description: 'Target principal designer or design lead roles. Prepare a portfolio narrative that emphasises strategic impact over pixel-level execution.',
            resources: 'Levels.fyi for salary benchmarking · Dribbble Jobs for design-specific listings',
            tag: 'Month 5–6' },
        ],
      },
    },
    {
      match: ['cybersecurity', 'security analyst', 'penetration tester', 'pen tester', 'ethical hacker', 'infosec', 'soc analyst'],
      steps: {
        beginner: [
          { title: 'Networking & OS Fundamentals',
            description: 'Cybersecurity is built on networking and operating systems. Learn TCP/IP, DNS, HTTP, firewalls, and how Linux works at the command line.',
            resources: 'Professor Messer CompTIA Network+ study materials (free) · OverTheWire Bandit (free Linux wargame)',
            tag: 'Month 1–2' },
          { title: 'Security Fundamentals & CompTIA Security+',
            description: 'Security+ is the entry-level certification most employers look for. Study threats, cryptography, identity management, and incident response.',
            resources: 'Professor Messer Security+ course (free) · CompTIA CertMaster Practice',
            tag: 'Month 2–4' },
          { title: 'Hands-On Practice with TryHackMe',
            description: 'TryHackMe offers guided labs for absolute beginners. Complete the "Pre-Security" and "Jr Penetration Tester" paths to build practical skills in a safe environment.',
            resources: 'TryHackMe.com (free & paid paths) · Hack The Box Starting Point',
            tag: 'Month 3–5' },
          { title: 'Learn a Scripting Language',
            description: 'Python is the most useful language for cybersecurity — used for scripting, automation, and writing simple exploits. Bash scripting is equally important for Linux.',
            resources: 'Automate the Boring Stuff with Python (free online) · Bash scripting tutorial on LinuxCommand.org',
            tag: 'Month 4–5' },
          { title: 'Apply for Entry-Level Roles',
            description: 'Target SOC Analyst Tier 1 or IT Security Technician roles. Build a simple home lab (using VirtualBox) and document it to demonstrate practical experience.',
            resources: 'VirtualBox (free virtualisation) · LinkedIn Jobs with "SOC Analyst" filter',
            tag: 'Month 5–7' },
        ],
        intermediate: [
          { title: 'Specialise: Offensive or Defensive?',
            description: `Based on your current skills (${skills || 'as listed'}), decide whether to move toward penetration testing (offensive) or threat detection/incident response (defensive). Each has its own certification path.`,
            resources: 'eLearnSecurity certifications (offensive) · Blue Team Labs Online (defensive)',
            tag: 'Week 1–2' },
          { title: 'Intermediate Certifications',
            description: 'CEH (Certified Ethical Hacker) or CompTIA CySA+ are strong intermediate certifications. Choose based on your offensive or defensive direction.',
            resources: 'EC-Council CEH materials · CompTIA CySA+ study guide',
            tag: 'Month 1–3' },
          { title: 'SIEM & Log Analysis',
            description: 'Learn to use SIEM tools (Splunk, IBM QRadar, or the free ELK Stack) to detect threats from log data. This is the core skill of most SOC analyst roles.',
            resources: 'Splunk Free Training (Splunk Fundamentals 1) · LetsDefend.io for blue team practice',
            tag: 'Month 2–4' },
          { title: 'CTF Competitions',
            description: 'Participate in Capture the Flag competitions to practise in a legal, competitive environment. CTF writeups on your blog or GitHub are excellent portfolio pieces.',
            resources: 'CTFtime.org (competition calendar) · PicoCTF (beginner-friendly CTF)',
            tag: 'Month 3–5' },
          { title: 'Mid-Level Applications',
            description: 'Apply for Penetration Tester, Security Engineer, or SOC Analyst Tier 2 roles. Document your home lab, CTF achievements, and certifications on LinkedIn.',
            resources: 'CyberSeek.org (cybersecurity career pathway map) · LinkedIn Jobs',
            tag: 'Month 5–6' },
        ],
        advanced: [
          { title: 'OSCP or CISSP Certification',
            description: 'OSCP (Offensive Security Certified Professional) is the gold standard for penetration testers. CISSP is the equivalent for security management. Pick the one aligned with your career direction.',
            resources: 'Offensive Security PWK course (OSCP) · ISC2 CISSP study guide',
            tag: 'Month 1–4' },
          { title: 'Threat Intelligence & Red Teaming',
            description: 'Move from individual tests to full red team operations. Learn threat intelligence frameworks (MITRE ATT&CK) and adversary simulation.',
            resources: 'MITRE ATT&CK Navigator (free) · Red Team Development and Operations by Joe Vest',
            tag: 'Month 2–5' },
          { title: 'Security Architecture',
            description: 'Understand how to design secure systems from the ground up — zero trust architecture, cloud security posture, and secure SDLC integration.',
            resources: 'NIST Cybersecurity Framework (free) · Cloud Security Alliance resources',
            tag: 'Month 3–5' },
          { title: 'Bug Bounty & Public Recognition',
            description: 'Participate in bug bounty programmes on HackerOne or Bugcrowd. Accepted reports are proof of real-world impact and build your public reputation.',
            resources: 'HackerOne · Bugcrowd',
            tag: 'Month 4–6' },
          { title: 'Senior / Lead Security Roles',
            description: 'Apply for Lead Penetration Tester, Security Architect, or CISO-track roles. Your certifications, CVE discoveries, and CTF history are your strongest differentiators.',
            resources: 'Levels.fyi · ISACA job board',
            tag: 'Month 6+' },
        ],
      },
    },
    {
      match: ['product manager', 'product management', 'pm', 'product owner'],
      steps: {
        beginner: [
          { title: 'Understand the PM Role',
            description: 'Product Management combines strategy, user research, and technical coordination. Read widely about what PMs actually do day-to-day before committing to the path.',
            resources: '"Inspired" by Marty Cagan · Lenny\'s Newsletter (lennysnewsletter.com)',
            tag: 'Month 1' },
          { title: 'Product Fundamentals',
            description: 'Learn frameworks like user story mapping, Jobs-to-be-Done, and prioritisation matrices (RICE, MoSCoW). These are the everyday tools of a PM.',
            resources: 'Product School free resources · Coursera Digital Product Management (University of Virginia)',
            tag: 'Month 1–3' },
          { title: 'Learn Basic Data & SQL',
            description: 'PMs who can query data independently are significantly more effective. Learn enough SQL to answer basic product questions without waiting for a data analyst.',
            resources: 'Mode SQL Tutorial (free) · Khan Academy SQL',
            tag: 'Month 2–3' },
          { title: 'Build Something Small',
            description: 'Use no-code tools (Notion, Bubble, or Glide) to build a simple product prototype. Going through the full product lifecycle — even at small scale — is invaluable experience.',
            resources: 'Bubble.io (free tier) · Product Hunt to explore ideas',
            tag: 'Month 3–5' },
          { title: 'Apply to APM / Junior PM Roles',
            description: 'Associate Product Manager programmes at large companies (Google APM, Meta RPM) are the most direct paths for beginners. Network extensively on LinkedIn.',
            resources: 'APM List (apmlist.com) · LinkedIn Jobs "Associate Product Manager"',
            tag: 'Month 5–7' },
        ],
        intermediate: [
          { title: 'Sharpen Discovery & Prioritisation',
            description: `Based on your skills (${skills || 'as listed'}), focus on the PM competencies you use least — continuous discovery, stakeholder alignment, or roadmap communication.`,
            resources: '"Continuous Discovery Habits" by Teresa Torres · "The Lean Startup" by Eric Ries',
            tag: 'Month 1' },
          { title: 'Metrics & Experimentation',
            description: 'Learn to define product metrics (activation rate, retention, NPS), run A/B tests, and interpret results correctly. Data-driven PMs are in high demand.',
            resources: 'Reforge Experimentation & Testing programme · Amplitude free product analytics',
            tag: 'Month 1–3' },
          { title: 'Stakeholder Management',
            description: 'Practice aligning engineering, design, marketing, and exec stakeholders around a single roadmap. Write clear one-pagers and PRDs.',
            resources: '"Shape Up" by Ryan Singer (free) · "Inspired" by Marty Cagan',
            tag: 'Month 2–3' },
          { title: 'Lead a Feature End-to-End',
            description: 'Own a feature from discovery to launch in your current role or a side project. Document it as a case study for interviews.',
            resources: 'Figma for wireframing · Notion for PRD templates',
            tag: 'Month 3–5' },
          { title: 'Senior PM Applications',
            description: 'Apply for senior PM roles. Prepare STAR-format stories about impact, prioritisation decisions, and cross-functional challenges you have navigated.',
            resources: 'Exponent.pm for PM interview prep · Glassdoor for company research',
            tag: 'Month 5–6' },
        ],
        advanced: [
          { title: 'Strategic Product Leadership',
            description: 'Move from managing a single product area to shaping multi-product strategy. Learn portfolio management, market positioning, and competitive analysis.',
            resources: '"Playing to Win" by Roger Martin · Stratechery by Ben Thompson',
            tag: 'Month 1–2' },
          { title: 'Build & Develop a PM Team',
            description: 'If in a leadership role, focus on hiring, coaching, and creating frameworks your team can use independently. Your leverage is through people.',
            resources: '"The Making of a Manager" by Julie Zhuo · First Round Review articles',
            tag: 'Month 2–4' },
          { title: 'Executive Communication',
            description: 'Learn to present strategy and results to C-suite and board audiences concisely and credibly. The ability to communicate up is what separates directors from senior PMs.',
            resources: '"Minto Pyramid Principle" by Barbara Minto · McKinsey communication guides',
            tag: 'Month 3–5' },
          { title: 'Thought Leadership',
            description: 'Speak at product conferences or write articles that demonstrate your expertise publicly. This opens doors to Principal PM and Director of Product roles.',
            resources: 'ProductCon (conference) · Lenny\'s Podcast (apply to be a guest)',
            tag: 'Month 4–6' },
          { title: 'Director / VP Product Applications',
            description: 'Target Director of Product or VP of Product roles. Lead with narratives about business impact, team growth, and product vision — not feature lists.',
            resources: 'Levels.fyi · Lenny\'s Job Board',
            tag: 'Month 6+' },
        ],
      },
    },
  ];

  // ── Find the best matching domain ──
  const matched = domains.find(d =>
    d.match.some(keyword => c.includes(keyword))
  );

  const validLevel = ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner';

  if (matched) {
    return matched.steps[validLevel];
  }

  // ── Generic fallback (no domain matched) ──
  const fallback = {
    beginner: [
      { title: `Learn the Fundamentals of ${career}`,
        description: `Start by identifying the 3–5 core technical skills every ${career} needs. Use free platforms like YouTube, freeCodeCamp, or Coursera to build a solid foundation before moving on.`,
        resources: 'Coursera (free to audit) · YouTube tutorials · freeCodeCamp',
        tag: 'Month 1–2' },
      { title: 'Find a Structured Course or Certification',
        description: `Search for a beginner certificate specifically for ${career} roles. Completing a structured programme signals commitment to employers and fills in knowledge gaps.`,
        resources: 'Coursera · edX · IBM SkillsBuild (free)',
        tag: 'Month 2–4' },
      { title: 'Build Your First Project',
        description: `Apply what you have learned by building a small, real project in the ${career} space. Document it with a README on GitHub, even if it is simple.`,
        resources: 'GitHub (free) · Replit for online coding environment',
        tag: 'Month 4–5' },
      { title: 'Join the Community',
        description: `Find online communities of ${career} professionals — LinkedIn groups, Reddit communities, or Discord servers. Ask questions, share your work, and start networking.`,
        resources: 'LinkedIn · Reddit (search your field) · Dev.to',
        tag: 'Month 4–6' },
      { title: 'Apply for Entry-Level Opportunities',
        description: `Start applying for internships or entry-level ${career} positions. Tailor your CV to highlight your new skills and the project you built.`,
        resources: 'LinkedIn Jobs · Indeed · Glassdoor',
        tag: 'Month 6+' },
    ],
    intermediate: [
      { title: `Identify Your ${career} Skill Gaps`,
        description: `Review 10 job descriptions for ${career} roles and list every skill you don't yet have. Prioritise the top 3 most frequently mentioned.`,
        resources: 'LinkedIn Jobs · Indeed job postings',
        tag: 'Week 1–2' },
      { title: 'Deepen Technical Skills',
        description: `Take an intermediate course or earn a professional certificate in your field. Leverage your existing skills (${skills || 'as listed'}) to move faster through familiar material.`,
        resources: 'Coursera Professional Certificates · edX MicroMasters',
        tag: 'Month 1–3' },
      { title: 'Build Portfolio Projects',
        description: `Create 2–3 polished projects that solve real problems a ${career} would face. Write brief case studies explaining your approach and results.`,
        resources: 'GitHub for hosting · Medium for writing case studies',
        tag: 'Month 2–4' },
      { title: 'Seek Mentorship & Feedback',
        description: `Find a mentor in the ${career} field through LinkedIn or professional associations. Ask for honest feedback on your portfolio and interview technique.`,
        resources: 'ADPList.org (free mentorship) · LinkedIn mentorship requests',
        tag: 'Month 3–5' },
      { title: 'Job Search & Interview Prep',
        description: `Prepare for technical and behavioural interviews common for ${career} roles. Research companies, tailor your applications, and practise out loud.`,
        resources: 'Glassdoor interview reviews · Exponent.pm · LeetCode',
        tag: 'Month 5–6' },
    ],
    advanced: [
      { title: `Specialise Within ${career}`,
        description: `Pick the most in-demand niche within ${career} and go deep. Specialisation commands higher pay and clearer positioning.`,
        resources: 'Industry-specific conferences · arXiv.org for research fields',
        tag: 'Month 1' },
      { title: 'Establish Thought Leadership',
        description: `Write articles, speak at meetups, or create tutorials about your specialisation. Public expertise significantly accelerates senior ${career} opportunities.`,
        resources: 'Medium · Dev.to · local meetup groups (Meetup.com)',
        tag: 'Month 1–3' },
      { title: 'Lead a Significant Project',
        description: `Volunteer to own and deliver a complex, cross-functional project. Senior ${career} roles look for evidence of initiative and impact at scale.`,
        resources: 'Internal projects · open source contributions on GitHub',
        tag: 'Month 2–4' },
      { title: 'Advanced Certification',
        description: `Obtain the most respected advanced certification in your ${career} specialisation. It validates expertise and opens doors to senior interviews.`,
        resources: 'Search "[your field] advanced certification" on Coursera, edX, or professional bodies',
        tag: 'Month 3–6' },
      { title: 'Senior Role Applications',
        description: `Target senior or lead ${career} positions. Lead with impact stories in your applications and use Levels.fyi to set realistic salary expectations.`,
        resources: 'Levels.fyi · LinkedIn Jobs · Glassdoor',
        tag: 'Month 6+' },
    ],
  };

  return fallback[validLevel];
}

// ── POST /api/roadmap/revise ──
// Takes the current roadmap steps + a user revision instruction
// and returns a revised set of steps in the same JSON format.
app.post('/api/roadmap/revise', async (req, res) => {
  const { steps, instruction, career, level } = req.body;

  // Validate instruction
  if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
    return res.status(400).json({ error: 'Revision instruction is required.' });
  }
  if (instruction.trim().length > 300) {
    return res.status(400).json({ error: 'Instruction must be 300 characters or fewer.' });
  }

  // Validate steps
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'No roadmap steps found to revise.' });
  }

  // Validate career / level
  const safeCareer = (career && typeof career === 'string') ? career.trim().slice(0, 100) : 'this career';
  const safeLevel  = ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner';

  // No API key — fall back gracefully
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'AI revision is not available in demo mode.' });
  }

  // Build a summary of the current roadmap for context
  const currentSummary = steps.slice(0, 10).map((s, i) => {
    const title     = typeof s?.title       === 'string' ? s.title.slice(0, 120)      : `Step ${i + 1}`;
    const desc      = typeof s?.description === 'string' ? s.description.slice(0, 300) : '';
    const resources = typeof s?.resources   === 'string' ? s.resources.slice(0, 200)   : '';
    const tag       = typeof s?.tag         === 'string' ? s.tag.slice(0, 40)          : '';
    return `Step ${i + 1} [${tag}]: ${title}\n  ${desc}${resources ? `\n  Resources: ${resources}` : ''}`;
  }).join('\n\n');

  const prompt = `
You are an expert career coach. A ${safeLevel}-level learner targeting a career as a ${safeCareer} has the following roadmap:

${currentSummary}

The user wants to revise this roadmap with the following constraint or instruction:
"${instruction.trim()}"

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "steps": [
    {
      "title": "Step title",
      "description": "2-3 sentence explanation adjusted to the user's constraint.",
      "resources": "1-2 specific courses, tools, or websites relevant to this step.",
      "tag": "Revised timeframe, e.g. Week 1-2"
    }
  ]
}

Rules:
- Produce exactly 5 steps.
- Adjust the pace, depth, and timeframes to match the user's constraint.
- Keep steps specific to the career "${safeCareer}" — do not use generic advice.
- Preserve strong resources from the original where still relevant.
- Do not include any text outside the JSON object.
`.trim();

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const raw = completion.choices[0].message.content.trim();

    let parsed;
    try {
      // Strip markdown code fences if model wraps the JSON
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Revise: non-JSON response:', raw.slice(0, 200));
      return res.status(500).json({ error: 'The AI returned an unexpected format. Please try again.' });
    }

    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return res.status(500).json({ error: 'The AI revision was missing steps. Please try again.' });
    }

    return res.json({ steps: parsed.steps, revised: true });

  } catch (err) {
    console.error('Revise API error:', err.message);

    if (err.status === 429 || err.status === 402 ||
        err.message?.includes('quota') || err.message?.includes('rate_limit')) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Please check your .env file.' });
    }
    return res.status(500).json({ error: 'Something went wrong while revising. Please try again.' });
  }
});

// ── POST /api/chat ──
// Follow-up questions about a generated roadmap
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }
  if (message.trim().length > 500) {
    return res.status(400).json({ error: 'Message must be 500 characters or fewer.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.json({ reply: "I'm in demo mode — AI follow-up isn't available. Try asking about a specific step in your roadmap manually." });
  }

  // ── Safely extract and validate context ──
  const career = (context?.career && typeof context.career === 'string') ? context.career.trim().slice(0, 100) : '';
  const level  = ['beginner', 'intermediate', 'advanced'].includes(context?.level) ? context.level : '';
  const steps  = Array.isArray(context?.steps) ? context.steps.slice(0, 10) : [];

  // ── Build roadmap summary for the system prompt ──
  let roadmapSummary = '';
  if (steps.length > 0) {
    roadmapSummary = '\n\nHere are the exact roadmap steps the user received:\n' +
      steps.map((s, i) => {
        const title     = typeof s?.title       === 'string' ? s.title.slice(0, 120)       : `Step ${i + 1}`;
        const desc      = typeof s?.description === 'string' ? s.description.slice(0, 300)  : '';
        const resources = typeof s?.resources   === 'string' ? s.resources.slice(0, 200)    : '';
        const tag       = typeof s?.tag         === 'string' ? s.tag.slice(0, 40)           : '';
        return `Step ${i + 1} [${tag}]: ${title}\n  ${desc}${resources ? `\n  Resources: ${resources}` : ''}`;
      }).join('\n\n');
  }

  const careerLine = career ? ` for becoming a ${career}${level ? ` at ${level} level` : ''}` : '';

  const systemPrompt =
    `You are a helpful, encouraging career mentor. The user has just received a personalised career roadmap${careerLine}.` +
    `${roadmapSummary}\n\n` +
    `Answer their follow-up questions accurately using the roadmap above. ` +
    `If they ask about a specific step, reference that step's title and resources directly. ` +
    `Be warm, direct, and specific. Keep replies under 150 words.`;

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });
    return res.json({ reply: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error('Chat API error:', err.message);
    if (err.status === 429 || err.status === 402 || err.message?.includes('rate_limit')) {
      return res.json({ reply: "I've hit my rate limit right now. Try again in a moment, or check the resources listed in your roadmap steps!" });
    }
    return res.status(500).json({ error: 'Could not get a reply. Please try again.' });
  }
});

// ── Fallback: serve index.html for any other route ──
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅  AI Career & Skills Mentor running at http://localhost:${PORT}`);
});
