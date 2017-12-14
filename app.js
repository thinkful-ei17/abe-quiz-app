'use strict';
/* global $*/

/**
 * Stores the Session Token for API Calls
 */
let SESSION_TOKEN = undefined;

/**
 * An object for relaying error information.
 */
const ERROR = {
  error: null,
  message: null,
}

/**
 * The Base URL for the Open Trivia Database
 */
const BASE_URL = 'https://opentdb.com/';

/**
 * The Primary path for Questions API
 */
const MAIN_PATH = '/api.php';

/**
 * The Primary path for working with Session Tokens
 */
const TOKEN_PATH = '/api_token.php';

/**
 * The Primary path for retrieving categories 
 */
const CATEGORY_PATH = '/api_category.php';

const DIFFICULTY = ['easy', 'medium','hard'];

let SELECTED_DIFFICULTY = undefined;
let TOTAL_QUESTIONS = 1;

/**
 * Build the endpoint URL for question calls
 */
const buildBaseUrl = function(){
  const url = new URL(BASE_URL);
  return url;
};

/**
 * Build the endpoint url for Token calls
 */
const buildTokenUrl = function(){
  const url = new URL(BASE_URL);
  url.pathname = TOKEN_PATH;
  url.searchParams.set('command','request');
  return url;
};

/**
 * 
 */
const buildMainUrl = function(){
  const mainUrl= buildBaseUrl();
  mainUrl.pathname = MAIN_URL;
  return mainUrl;
}

/**
 * 
 */
const buildCategoryUrl = function(){
  const categoryUrl = buildBaseUrl()
  categoryUrl.pathname = CATEGORY_PATH;
  return categoryUrl;
}

const setSessionToken = function(response){
  try {
    SESSION_TOKEN = response.token;
  } catch (error) {
    ERROR.error = error.message;
    ERROR.message = 'There was an error starting a new quiz session.'
  }
};

const getCategories = function(callback){
  $.getJSON(buildCategoryUrl(), callback);
};

const generateCategoriesHtml = function(response){
  console.log(response.trivia_categories);
  let html = '';
  response.trivia_categories.forEach( c => html +=`<option id="${c.id}">${c.name}</option>`);
  $('.js-category').append(html);

};

const generateQuizSetupHtml = function(){

  return `
  <label for="numberOfQuestions">Number of Questions</label>
  <select>
  
  </select>
  `;
}

const start = function(){
  $('.js-start').removeAttr('disabled');
  $('.js-category').removeAttr('disabled');
  $('.js-total-questions').removeAttr('disabled');
  $('.js-difficulty').removeAttr('disabled');
  render();
  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  
    $('.js-question').on('submit', handleSubmitAnswer);
    $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
}

/**
 * Fetch a Token using the buildTokenUrl() method 
 */
const fetchToken = function(callback){
  $.getJSON(buildTokenUrl(), callback);
};

/**
 * Fetch a single question from the Open Trivia db 
 */
const fetchQuestion = function(category, difficulty){
  const questionUrl = buildBaseUrl();
  questionUrl.searchParams.set('amount','1');
  questionUrl.searchParams.set('category','15');
  questionUrl.searchParams.set('type','multiple');
  questionUrl.searchParams.set('difficulty','easy');
  questionUrl.searchParams.set('token', SESSION_TOKEN);

  $.getJSON(questionUrl, function(response){
    try {
      const question= response.results[0];
      const decoratedQuestion = decorateQuestion(question);
      addQuestion(decoratedQuestion);
    } catch (error) {
      ERROR.error = error.message;
      ERROR.message = 'There was an error retrieving the next question';
    }
  });
};

/**
 * Decorate the question object from the received response to match the
 * format in QUESTIONS
 */
const decorateQuestion = function(question){
  return {
    text: question.question,
    answers: [...question.incorrect_answers, question.correct_answer],
    correctAnswer: question.correct_answer 
  };
}

/**
 * Add question to Store
 */
const addQuestion = function(questionObject){
  QUESTIONS.push(questionObject);
};



const TOP_LEVEL_COMPONENTS = [
  'js-intro', 'js-question', 'js-question-feedback', 'js-outro', 'js-quiz-status'
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

const getSelectedCategoryId = function(){
  return $('.js-category option:selected').attr('id');
}

const getSelectedDifficulty = function(){
  return $('.js-difficulty').val().toLowerCase();
}

const getSelectedNumberOfQuestions = function(){
  return $('.js-total-questions').val();
}

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
    total: QUESTIONS.length
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

const generateIntroHtml = function(){
  return `
  <
  `
}

const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
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
        <legend class="question-text">${question.text}</legend>
          ${answers}
          <button type="submit">Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>${feedback}</p>
    <button class="continue js-continue">Continue</button>
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
  store = getInitialStore();
  store.page = 'question';
  store.currentQuestionIndex = 0;
  render();
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);

  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUESTIONS.length - 1) {
    store.page = 'outro';
    render();
    return;
  }

  store.currentQuestionIndex++;
  store.page = 'question';
  render();
};

// On DOM Ready, run render() and add event listeners
$(() => {
  fetchToken(function(response){
    setSessionToken(response);
    getCategories(generateCategoriesHtml);
    start();
  });
});
