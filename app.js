'use strict';
/* global $*/

/**
 * TriviaApi
 */
class TriviaApi {
  constructor() {
    this._sessionToken = '';
  }

  /**
   * Get the current Session Token
   */
  getNewSessionToken(callback) {
    this._fetchToken(callback);
  }

  /**
   * Fetch a new Token from the Open Trivia Database API
   */
  _fetchToken(callback) {
    $.getJSON(
      'https://opentdb.com/api_token.php?command=request',
      e => (this._sessionToken = e.token)
    );
    if (!(callback === undefined)) callback();
  }

  getSessionToken() {
    return this._sessionToken;
  }

  getCategories(callback) {
    $.getJSON('https://opentdb.com/api_category.php', callback);
  }

  _fetchQuestion(callback) {
    const url = new URL('https://opentdb.com');
    url.pathname = '/api.php';
    url.searchParams.set('type', 'multiple');
    url.searchParams.set('amount', '1');
    url.searchParams.set('category', QUIZ_OPTIONS.category);
    url.searchParams.set('difficulty', QUIZ_OPTIONS.difficulty);
    url.searchParams.set('token', this.getSessionToken());
    
    const decorate = this._decorateQuestion;
    const add = this._addQuestion;
    const cb = callback;
    $.getJSON(url, function(response){
      try {
        const question = response.results[0];
        const decoratedQuestion = decorate(question);
        add(decoratedQuestion);
        cb();
      } catch (error) {
        throw new Error(`there was an error retrieving the next question: ${error.message}`);
      }
    });
  }

  _decorateQuestion(question) {
    console.log('decorate question ran');
    return {
      text: question.question,
      answers: [...question.incorrect_answers, question.correct_answer],
      correctAnswer: question.correct_answer
    };
  }

  _addQuestion(questionObject) {
    console.log('add question ran');
    QUESTIONS.push(questionObject);
  }
  
  getNewQuestion(callback){
    this._fetchQuestion(callback);
  }
}

const trivia = new TriviaApi();

/**
 * Options for the Current Quiz Game
 */
const QUIZ_OPTIONS = {
  category: 11,
  difficulty: 'easy',
  questions: 10
};

/**
 * Generate the Categories HTML option elements from the API call
 * should be used as a callback to `getCategories()`
 * @param {object} response
 */
const generateCategoriesHtml = function(response) {
  let html = '';
  response.trivia_categories.forEach(
    c => (html += `<option id='${c.id}'>${c.name}</option>`)
  );
  $('.js-category').append(html);
};

/**
 * This function is the initial function that runs after we receive the Session Token
 * and should be the callback for `fetchToken()`
 */
const start = function() {
  $('.js-start').removeAttr('disabled');
  $('.js-category').removeAttr('disabled');
  $('.js-total-questions').removeAttr('disabled');
  $('.js-difficulty').removeAttr('disabled');

  $('.js-category').change(function() {
    setCategory();
  });

  $('.js-total-questions').change(function() {
    setSelectedNumberOfQuestions();
  });

  $('.js-difficulty').change(function() {
    setDifficulty();
  });

  render();

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);

  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
};

const TOP_LEVEL_COMPONENTS = [
  'js-intro',
  'js-question',
  'js-question-feedback',
  'js-outro',
  'js-quiz-status'
];

const QUESTIONS = [];

const getInitialStore = function() {
  return {
    page: 'intro',
    currentQuestionIndex: null,
    userAnswers: [],
    feedback: null
  };
};

let store = getInitialStore();

// Helper functions
// ===============

/**
 * Returns the Category Id that the user selected in the DOM
 * @returns {number}
 */
const getSelectedCategoryId = function() {
  return $('.js-category option:selected').attr('id');
};

/**
 *
 */
const setCategory = function() {
  QUIZ_OPTIONS.category = getSelectedCategoryId();
};

/**
 * Returns the Difficulty value that the user selected in the DOM
 * @returns {string}
 */
const getSelectedDifficulty = function() {
  return $('.js-difficulty')
    .val()
    .toLowerCase();
};

const setDifficulty = function() {
  QUIZ_OPTIONS.difficulty = getSelectedDifficulty();
};

/**
 * Returns the Number of Questions the user selected in the DOM
 * @returns {number}
 */
const getSelectedNumberOfQuestions = function() {
  return $('.js-total-questions').val();
};

const setSelectedNumberOfQuestions = function() {
  QUIZ_OPTIONS.questions = getSelectedNumberOfQuestions();
};

const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};

const getScore = function() {
  return store.userAnswers.reduce((accumulator, userAnswer, index) => {
    const question = getQuestion(index);

    if (question.correctAnswer === userAnswer) {
      return accumulator + 1;
    } else {
      return accumulator;
    }
  }, 0);
};

const getProgress = function() {
  return {
    current: store.currentQuestionIndex + 1,
    total: QUIZ_OPTIONS.questions
  };
};

const getCurrentQuestion = function() {
  return QUESTIONS[store.currentQuestionIndex];
};

const getQuestion = function(index) {
  return QUESTIONS[index];
};

// HTML generator functions
// ========================

const generateAnswerItemHtml = function(answer) {
  return `
    <li class='answer-item'>
      <input type='radio' name='answers' value='${answer}' />
      <span class='answer-text'>${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = question.answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
    .join('');

  return `
    <form>
      <fieldset>
        <legend class='question-text'>${question.text}</legend>
          ${answers}
          <button type='submit'>Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>${feedback}</p>
    <button class='continue js-continue'>Continue</button>
  `;
};

// Render function - uses `store` object to construct entire page every time it's run
// ===============
const render = function() {
  let html;
  hideAll();

  const question = getCurrentQuestion();
  const { feedback } = store;
  const { current, total } = getProgress();

  $('.js-score').html(`<span>Score: ${getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (store.page) {
  case 'intro':
    $('.js-intro').show();
    break;

  case 'question':
    html = generateQuestionHtml(question);
    $('.js-question').html(html);
    $('.js-question').show();
    $('.quiz-status').show();
    break;

  case 'answer':
    html = generateFeedbackHtml(feedback);
    $('.js-question-feedback').html(html);
    $('.js-question-feedback').show();
    $('.quiz-status').show();
    break;

  case 'outro':
    $('.js-outro').show();
    $('.quiz-status').show();
    break;

  default:
    return;
  }
};

// Event handler functions
// =======================
const handleStartQuiz = function() {
  trivia.getNewQuestion(function() {
    store = getInitialStore();
    store.page = 'question';
    store.currentQuestionIndex = 0;
    render();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);

  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${
      question.correctAnswer
    }`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUIZ_OPTIONS.questions - 1) {
    // we reached the end

    trivia.getNewSessionToken(function() {
      QUESTIONS.length = 0;
      store = getInitialStore();
      store.page = 'outro';
      render();
    });
    return;
  }

  store.currentQuestionIndex++;
  trivia.getNewQuestion(function() {
    store.page = 'question';
    render();
  });
};

// On DOM Ready fetches a session token and calls `start` which renders and sets handlers
$(() => {
  trivia.getNewSessionToken(function() {
    trivia.getCategories(generateCategoriesHtml);
    start();
  });
});
