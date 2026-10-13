let studioInstance = 0;

const icons = {
  arrow: [['path', { d: 'M19 12H5m7-7-7 7 7 7' }]],
  search: [['circle', { cx: '10.5', cy: '10.5', r: '6.5' }], ['path', { d: 'm16 16 4.5 4.5' }]],
  check: [['path', { d: 'm5 12 4 4L19 6' }]],
  book: [['path', { d: 'M12 5v15M3 4.5c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v14c-3-1-6-.5-9 1.5-3-2-6-2.5-9-1.5z' }]],
  external: [['path', { d: 'M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6' }]],
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [tag, attributes] of icons[name] || []) {
    const child = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
    svg.append(child);
  }
  return svg;
}

function button(className, text) {
  const node = element('button', className, text);
  node.type = 'button';
  return node;
}

function appendParagraphs(parent, text, className) {
  for (const paragraph of String(text || '').split(/\n\s*\n/).filter(Boolean)) {
    parent.append(element('p', className, paragraph));
  }
}

function sourceURL(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Mount a self-contained lesson studio. The caller owns persistence and styles.
 * Completion is emitted only after a correct answer and an explicit completion click.
 * @returns {{destroy: () => void}}
 */
export function mountLearning(container, {
  lessons = [], sources = [], completed = [], initialLesson = null, onComplete = () => {}, onClose = () => {},
} = {}) {
  if (!container || typeof container.append !== 'function') {
    throw new TypeError('mountLearning requires a DOM container.');
  }
  const prefix = `learning-${++studioInstance}`;
  const lessonList = Array.isArray(lessons) ? lessons.filter(Boolean) : [];
  const sourceList = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const done = new Set(Array.isArray(completed) ? completed : []);
  const positions = new Map();
  const categories = [...new Set(lessonList.map(lesson => lesson.category || 'General'))];
  let current = lessonList.find(lesson => lesson.id === initialLesson) || lessonList[0] || null;
  let category = null;
  let query = '';
  let destroyed = false;

  const root = element('section', 'learning-studio');
  root.setAttribute('aria-label', 'Theory studio');
  const top = element('div', 'learning-topbar');
  const close = button('learning-back', '');
  close.append(icon('arrow'), element('span', '', 'Back to world'));
  close.addEventListener('click', () => onClose());
  const identity = element('div', 'learning-identity');
  identity.append(icon('book'), element('span', '', 'Theory studio'));
  const progress = element('div', 'learning-progress');
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  const progressText = element('span', 'learning-progress-label');
  const progressTrack = element('span', 'learning-progress-track');
  progressTrack.setAttribute('aria-hidden', 'true');
  const progressFill = element('span', 'learning-progress-fill');
  progressTrack.append(progressFill);
  progress.append(progressText, progressTrack);
  top.append(close, identity, progress);

  const layout = element('div', 'learning-layout');
  const sidebar = element('nav', 'learning-sidebar');
  sidebar.setAttribute('aria-label', 'Lessons');
  const libraryHead = element('div', 'learning-library-heading');
  libraryHead.append(element('p', 'learning-eyebrow', 'Upper GI learning'), element('h2', '', 'Build your understanding'));
  libraryHead.append(element('p', 'learning-library-intro', 'Explore the theory behind the view. Read a lesson, then check your understanding.'));
  const searchLabel = element('label', 'learning-search');
  searchLabel.htmlFor = `${prefix}-search`;
  searchLabel.append(icon('search'), element('span', 'learning-sr-only', 'Search lessons'));
  const search = element('input', 'learning-search-input');
  search.id = `${prefix}-search`;
  search.type = 'search';
  search.placeholder = 'Search lessons';
  search.autocomplete = 'off';
  searchLabel.append(search);
  const filters = element('div', 'learning-filters');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filter lessons by category');
  const categoryButtons = [];
  function addCategory(label, value) {
    const node = button('learning-filter', label);
    node.setAttribute('aria-pressed', String(value === category));
    node.addEventListener('click', () => {
      category = value;
      for (const item of categoryButtons) item.node.setAttribute('aria-pressed', String(item.value === category));
      renderList();
    });
    categoryButtons.push({ node, value });
    filters.append(node);
  }
  addCategory('All lessons', null);
  categories.forEach(value => addCategory(value, value));
  const resultCount = element('p', 'learning-result-count');
  resultCount.setAttribute('role', 'status');
  const list = element('div', 'learning-lesson-list');
  const libraryFoot = element('p', 'learning-library-foot', 'Learning is a companion to supervised practice.');
  sidebar.append(libraryHead, searchLabel, filters, resultCount, list, libraryFoot);

  const reader = element('div', 'learning-reader');
  reader.id = `${prefix}-reader`;
  reader.setAttribute('role', 'region');
  reader.setAttribute('aria-label', 'Lesson reader');
  reader.tabIndex = -1;
  layout.append(sidebar, reader);
  root.append(top, layout);
  container.append(root);

  function updateProgress() {
    const count = lessonList.filter(lesson => done.has(lesson.id)).length;
    progressText.textContent = `${count} of ${lessonList.length} completed`;
    progressFill.style.width = `${lessonList.length ? count / lessonList.length * 100 : 0}%`;
  }

  function filteredLessons() {
    return lessonList.filter(lesson => {
      const matchesCategory = category == null || (lesson.category || 'General') === category;
      const searchText = `${lesson.title || ''} ${lesson.summary || ''} ${lesson.category || ''}`.toLowerCase();
      return matchesCategory && searchText.includes(query.trim().toLowerCase());
    });
  }

  function renderList() {
    list.replaceChildren();
    const matches = filteredLessons();
    resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'lesson' : 'lessons'}${query.trim() || category ? ' found' : ' to explore'}`;
    if (!matches.length) {
      const empty = element('div', 'learning-list-empty');
      empty.append(icon('search'), element('h3', '', lessonList.length ? 'No matching lessons' : 'Your library is being prepared'));
      empty.append(element('p', '', lessonList.length ? 'Try a different search or show all categories.' : 'Lessons will appear here when they are available.'));
      if (lessonList.length) {
        const reset = button('learning-text-button', 'Clear filters');
        reset.addEventListener('click', () => {
          query = '';
          category = null;
          search.value = '';
          categoryButtons.forEach(item => item.node.setAttribute('aria-pressed', String(item.value == null)));
          renderList();
          search.focus();
        });
        empty.append(reset);
      }
      list.append(empty);
      return;
    }
    for (const lesson of matches) {
      const item = button('learning-lesson', '');
      item.setAttribute('aria-controls', reader.id);
      if (current === lesson) item.setAttribute('aria-current', 'true');
      const metadata = element('span', 'learning-lesson-meta');
      metadata.append(element('span', '', lesson.category || 'General'));
      if (lesson.duration) metadata.append(element('span', '', lesson.duration));
      item.append(metadata, element('span', 'learning-lesson-title', lesson.title || 'Untitled lesson'));
      if (lesson.summary) item.append(element('span', 'learning-lesson-summary', lesson.summary));
      const status = element('span', 'learning-lesson-status');
      if (done.has(lesson.id)) {
        status.classList.add('is-complete');
        status.append(icon('check'), element('span', '', 'Completed'));
      } else {
        status.append(element('span', 'learning-status-dot'), element('span', '', current === lesson ? 'Reading now' : 'Read lesson'));
      }
      item.append(status);
      item.addEventListener('click', () => {
        if (current !== lesson) {
          if (current) positions.set(current.id, { reader: reader.scrollTop, layout: layout.scrollTop });
          current = lesson;
          renderReader();
          renderList();
        }
        reader.querySelector('.learning-article-title')?.focus({ preventScroll: true });
      });
      list.append(item);
    }
  }

  function renderSources(article, lesson) {
    const referenced = (lesson.sourceIds || []).map(id => sourceList.find(source => source.id === id)).filter(Boolean);
    if (!referenced.length) return;
    const referenceSection = element('section', 'learning-sources');
    const heading = element('h2', 'learning-subheading', 'Sources & further reading');
    referenceSection.append(heading, element('p', 'learning-source-note', 'Open a source to explore the original guidance.'));
    const references = element('ul', 'learning-source-list');
    for (const source of referenced) {
      const item = element('li', 'learning-source');
      const url = sourceURL(source.url);
      const title = element(url ? 'a' : 'span', 'learning-source-title', source.title || 'Source');
      if (url) {
        title.href = url;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
        title.append(icon('external'), element('span', 'learning-sr-only', ' (opens in a new tab)'));
      }
      const metadata = [source.organization, source.year].filter(Boolean).join(' · ');
      item.append(title);
      if (metadata) item.append(element('span', 'learning-source-meta', metadata));
      references.append(item);
    }
    referenceSection.append(references);
    article.append(referenceSection);
  }

  function renderQuestion(article, lesson) {
    const question = lesson.question;
    const answer = question?.answer ?? question?.correctIndex;
    const hasQuestion = question && Array.isArray(question.options) && question.options.length > 0 && Number.isInteger(answer) && answer >= 0 && answer < question.options.length;
    const card = element('section', 'learning-check');
    const checkHeader = element('div', 'learning-check-header');
    checkHeader.append(element('span', 'learning-check-symbol', '?'), element('div', '', ''));
    checkHeader.lastChild.append(element('p', 'learning-eyebrow', 'Put it into practice'), element('h2', 'learning-subheading', 'Check your understanding'));
    card.append(checkHeader);
    if (!hasQuestion) {
      card.append(element('p', 'learning-check-intro', 'A knowledge check is being prepared for this lesson. You can explore its sources and return when it is available.'));
      if (done.has(lesson.id)) card.append(element('p', 'learning-completion-note', 'You have completed this lesson.'));
      article.append(card);
      return;
    }
    const form = element('form', 'learning-answer-form');
    const fieldset = element('fieldset', 'learning-answers');
    const legend = element('legend', 'learning-question', question.prompt);
    fieldset.append(legend);
    let selected = null;
    let correct = false;
    const answerLabels = [];
    const feedback = element('div', 'learning-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.setAttribute('aria-atomic', 'true');
    feedback.id = `${prefix}-feedback`;
    const check = button('learning-primary-button', 'Check answer');
    check.type = 'submit';
    check.disabled = true;
    const finish = button('learning-complete-button', done.has(lesson.id) ? 'Lesson completed' : 'Mark lesson complete');
    finish.disabled = true;
    const completionNote = element('p', 'learning-completion-note', done.has(lesson.id) ? 'You have completed this lesson. Revisit the question any time.' : 'Answer correctly to complete this lesson.');
    for (const [index, option] of question.options.entries()) {
      const label = element('label', 'learning-answer');
      const radio = element('input', 'learning-answer-radio');
      radio.type = 'radio';
      radio.name = `${prefix}-answer`;
      radio.value = String(index);
      radio.setAttribute('aria-describedby', feedback.id);
      label.append(radio, element('span', 'learning-answer-letter', String.fromCharCode(65 + index)), element('span', 'learning-answer-text', option));
      radio.addEventListener('change', () => {
        selected = index;
        correct = false;
        check.disabled = false;
        finish.disabled = true;
        feedback.replaceChildren();
        feedback.className = 'learning-feedback';
        answerLabels.forEach(node => node.classList.remove('is-correct', 'is-incorrect'));
        completionNote.textContent = done.has(lesson.id) ? 'You have completed this lesson. Revisit the question any time.' : 'Answer correctly to complete this lesson.';
      });
      answerLabels.push(label);
      fieldset.append(label);
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (selected == null) return;
      correct = selected === answer;
      feedback.replaceChildren();
      feedback.className = `learning-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
      answerLabels.forEach(node => node.classList.remove('is-correct', 'is-incorrect'));
      answerLabels[selected].classList.add(correct ? 'is-correct' : 'is-incorrect');
      feedback.append(element('strong', '', correct ? 'That’s correct.' : 'Take another look.'));
      if (question.explanation) feedback.append(element('p', '', question.explanation));
      if (!correct) feedback.append(element('p', 'learning-feedback-hint', 'Choose another answer and check again.'));
      finish.disabled = !correct || done.has(lesson.id);
      completionNote.textContent = correct && !done.has(lesson.id) ? 'You’re ready to mark this lesson complete.' : done.has(lesson.id) ? 'You have completed this lesson.' : 'Answer correctly to complete this lesson.';
    });
    finish.addEventListener('click', () => {
      if (!correct || done.has(lesson.id) || destroyed) return;
      done.add(lesson.id);
      finish.disabled = true;
      finish.textContent = 'Lesson completed';
      completionNote.textContent = 'Lesson completed. Choose another lesson when you’re ready.';
      updateProgress();
      renderList();
      onComplete(lesson.id);
    });
    const actions = element('div', 'learning-check-actions');
    actions.append(check, finish);
    form.append(fieldset, feedback, actions, completionNote);
    card.append(form);
    article.append(card);
  }

  function renderReader() {
    reader.replaceChildren();
    if (!current) {
      const empty = element('div', 'learning-reader-empty');
      empty.append(icon('book'), element('h2', '', 'Your next lesson starts here'), element('p', '', 'Select a lesson from the library when it becomes available.'));
      reader.append(empty);
      return;
    }
    const lesson = current;
    const article = element('article', 'learning-article');
    const heading = element('div', 'learning-article-heading');
    const metadata = element('div', 'learning-article-meta');
    metadata.append(element('span', 'learning-category', lesson.category || 'General'));
    if (lesson.duration) metadata.append(element('span', 'learning-duration', `${lesson.duration} · reading time`));
    const title = element('h1', 'learning-article-title', lesson.title || 'Untitled lesson');
    title.tabIndex = -1;
    heading.append(metadata, title);
    if (lesson.summary) heading.append(element('p', 'learning-article-summary', lesson.summary));
    article.append(heading);
    const body = element('div', 'learning-article-body');
    if (Array.isArray(lesson.objectives) && lesson.objectives.length) {
      const objectives = element('section', 'learning-objectives');
      objectives.append(element('h2', 'learning-eyebrow', 'What you will learn'));
      const items = element('ul', 'learning-objective-list');
      lesson.objectives.forEach(text => {
        const item = element('li', '');
        item.append(icon('check'), element('span', '', text));
        items.append(item);
      });
      objectives.append(items);
      body.append(objectives);
    }
    for (const section of lesson.sections || []) {
      const block = element('section', 'learning-content-section');
      if (section.heading || section.title) block.append(element('h2', 'learning-subheading', section.heading || section.title));
      appendParagraphs(block, section.body, 'learning-prose');
      if (Array.isArray(section.bullets) && section.bullets.length) {
        const bullets = element('ul', 'learning-bullets');
        section.bullets.forEach(text => bullets.append(element('li', '', text)));
        block.append(bullets);
      }
      body.append(block);
    }
    article.append(body);
    renderQuestion(article, lesson);
    renderSources(article, lesson);
    const footer = element('div', 'learning-article-footer');
    footer.append(element('span', '', 'Theory supports your practice.'), element('span', '', 'Return to the world to explore.'));
    article.append(footer);
    reader.append(article);
    const position = positions.get(lesson.id);
    reader.scrollTop = position?.reader || 0;
    layout.scrollTop = position?.layout || 0;
  }

  search.addEventListener('input', () => {
    query = search.value;
    renderList();
  });
  updateProgress();
  renderList();
  renderReader();

  return {
    destroy() {
      destroyed = true;
      root.remove();
      positions.clear();
    },
  };
}
