import React, {Component} from 'react';
import {Redirect, withRouter} from 'react-router-dom';
import {
  Collapse,
  Container,
  Row,
  Col,
  Input,
  Label,
  InputGroup,
  InputGroupAddon,
  Button,
  Card,
  CardBody,
} from 'reactstrap';
import {withTranslation} from 'react-i18next';
import {ReactMultiEmail, isEmail} from 'react-multi-email';
import 'react-multi-email/style.css';
import {toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {resolve} from 'url';
import queryString from 'query-string';
import {
  arrayMove,
  sortableContainer,
  sortableElement,
  sortableHandle,
} from 'react-sortable-hoc';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrashAlt,
  faCheck,
  faCogs,
} from '@fortawesome/free-solid-svg-icons';
import {i18nGrades} from '../../Util';
import {AppContext} from '../../AppContext';
import HelpButton from '../form/HelpButton';
import ButtonWithConfirm from '../form/ButtonWithConfirm';
import Loader from '../wait';
import i18n from '../../i18n'


// Error messages
const AT_LEAST_2_CANDIDATES_ERROR = 'Please add at least 2 candidates.'
const NO_TITLE_ERROR = 'Please add a title.'

// Convert a Date object into YYYY-MM-DD
const dateToISO = date => date.toISOString().substring(0, 10);

// Retrieve the current hour, minute, sec, ms, time into a timestamp
const hours = date => date.getHours() * 3600 * 1000;
const minutes = date => date.getMinutes() * 60 * 1000;
const seconds = date => date.getSeconds() * 1000;
const ms = date => date.getMilliseconds();
const time = date => hours(date) + minutes(date) + seconds(date) + ms(date);

// Retrieve the time part from a timestamp and remove the day. Return a int.
const timeMinusDate = date => time(date);

// Retrieve the day and remove the time. Return a Date
const dateMinusTime = date => new Date(date.getTime() - time(date));

const DragHandle = sortableHandle(({children}) => (
    <span className="input-group-text indexNumber">{children}</span>
));

const displayClockOptions = () =>
    Array(24)
        .fill(1)
        .map((x, i) => (
            <option value={i} key={i}>
              {i}h00
            </option>
        ));

const SortableCandidate = sortableElement(({candidate, sortIndex, form, t}) => (
    <li className="sortable">
      <Row key={'rowCandidate' + sortIndex}>
        <Col>
          <InputGroup>
            <InputGroupAddon addonType="prepend">
              <DragHandle>
                <span>{sortIndex + 1}</span>
              </DragHandle>
            </InputGroupAddon>
            <Input
                type="text"
                value={candidate.label}
                onChange={event => form.editCandidateLabel(event, sortIndex)}
                onKeyPress={event =>
                    form.handleKeypressOnCandidateLabel(event, sortIndex)
                }
                placeholder={t('Candidate/proposal name...')}
                tabIndex={sortIndex + 1}
                innerRef={ref => (form.candidateInputs[sortIndex] = ref)}
                maxLength="250"
            />
            <ButtonWithConfirm className="btn btn-primary input-group-append border-light">
              <div key="button">
                <FontAwesomeIcon icon={faTrashAlt} />
              </div>
              <div key="modal-title">{t('Delete?')}</div>
              <div key="modal-body">
                {t('Are you sure to delete')}{' '}
                {candidate.label !== '' ? (
                    <b>"{candidate.label}"</b>
                ) : (
                    <span>
                  {t('the row')} {sortIndex + 1}
                </span>
                )}{' '}
                ?
              </div>
              <div
                  key="modal-confirm"
                  onClick={() => form.removeCandidate(sortIndex)}>
                Oui
              </div>
              <div key="modal-cancel">Non</div>
            </ButtonWithConfirm>
          </InputGroup>
        </Col>
        <Col xs="auto" className="align-self-center pl-0">
          <HelpButton>
            {t(
                'Write here your question or introduce simple your election (250 characters max.)',
            )}
          </HelpButton>
        </Col>
      </Row>
    </li>
));

const SortableCandidatesContainer = sortableContainer(({items, form, t}) => {
  return (
      <ul className="sortable">
        {items.map((candidate, index) => (
            <SortableCandidate
                key={`item-${index}`}
                index={index}
                sortIndex={index}
                candidate={candidate}
                form={form}
                t={t}
            />
        ))}
      </ul>
  );
});

class CreateElection extends Component {
  static contextType = AppContext;
  constructor(props) {
    super(props);
    // default value : start at the last hour
    const now = new Date();
    const start = new Date(
        now.getTime() - minutes(now) - seconds(now) - ms(now),
    );
    const {title} = queryString.parse(this.props.location.search);

    this.state = {
      candidates: [{label: ''}, {label: ''}],
      title: title || '',
      isVisibleTipsDragAndDropCandidate: true,
      numGrades: 7,
      waiting: false,
      successCreate: false,
      redirectTo: null,
      isAdvancedOptionsOpen: false,
      start,
      // by default, the election ends in a week
      finish: new Date(start.getTime() + 7 * 24 * 3600 * 1000),
      electorEmails: [],
    };
    this.candidateInputs = [];
    this.focusInput = React.createRef();
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChangeTitle = event => {
    this.setState({title: event.target.value});
  };

  addCandidate = event => {
    let candidates = this.state.candidates;
    if (candidates.length < 100) {
      candidates.push({label: ''});
      this.setState({candidates: candidates});
    }
    if (event.type === 'keypress') {
      setTimeout(() => {
        this.candidateInputs[this.state.candidates.length - 1].focus();
      }, 250);
    }
  };

  removeCandidate = index => {
    let candidates = this.state.candidates;
    candidates.splice(index, 1);
    if (candidates.length === 0) {
      candidates = [{label: ''}];
    }
    this.setState({candidates: candidates});
  };

  editCandidateLabel = (event, index) => {
    let candidates = this.state.candidates;
    candidates[index].label = event.currentTarget.value;
    candidates.map((candidate, i) => {
      return candidate.label;
    });
    this.setState({
      candidates: candidates,
    });
  };

  handleKeypressOnCandidateLabel = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (index + 1 === this.state.candidates.length) {
        this.addCandidate(event);
      } else {
        this.candidateInputs[index + 1].focus();
      }
    }
  };

  onCandidatesSortEnd = ({oldIndex, newIndex}) => {
    let candidates = this.state.candidates;
    candidates = arrayMove(candidates, oldIndex, newIndex);
    this.setState({candidates: candidates});
  };

  handleChangeNumGrades = event => {
    this.setState({numGrades: event.target.value});
  };

  toggleAdvancedOptions = () => {
    this.setState({isAdvancedOptionsOpen: !this.state.isAdvancedOptionsOpen});
  };

  checkFields() {
      const { candidates, title } = this.state;

      if (!candidates) {
        return {ok: false, msg: AT_LEAST_2_CANDIDATES_ERROR};
      }

      let numCandidates = 0;
      candidates.forEach(c => {
        if (c !== "") numCandidates += 1;
      })
      if (numCandidates < 2) {
        return {ok: false, msg: AT_LEAST_2_CANDIDATES_ERROR};
      }

      if (!title || title === "") {
        return {ok: false, msg: NO_TITLE_ERROR};
      }
  
      return {ok: true, msg: "OK"};
  }

  handleSubmit() {
    const {
      candidates,
      title,
      numGrades,
      start,
      finish,
      electorEmails,
    } = this.state;

    const endpoint = resolve(
        this.context.urlServer,
        this.context.routesServer.setElection,
    );

    const {t} = this.props;
    const locale=i18n.language.substring(0,2).toLowerCase()==="fr"?"fr":"en";

    const check = this.checkFields();
    if (!check.ok) {
        toast.error(t(check.msg), {
          position: toast.POSITION.TOP_CENTER,
        });
        return
    }

    this.setState({waiting: true});

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        candidates: candidates.map(c => c.label).filter( c => c !== ""),
        on_invitation_only: electorEmails.length > 0,
        num_grades: numGrades,
        elector_emails: electorEmails,
        start_at: start.getTime() / 1000,
        finish_at: finish.getTime() / 1000,
        select_language: locale,
        front_url : window.location.origin
      }),
    })
      .then(response => response.json())
      .then(result => {
        console.log(result);
        if (result.id) {
          const nextPage =
            electorEmails && electorEmails.length
              ? `/link/${result.id}`
              : `/links/${result.id}`;
          this.setState(state => ({
            redirectTo: nextPage,
            successCreate: true,
            waiting: false,
          }));
        } else {
          toast.error(t('Unknown error. Try again please.'), {
            position: toast.POSITION.TOP_CENTER,
          });
          this.setState({waiting: false});
        }
      })
      .catch(error => error);
  }

  handleSendNotReady = (msg) => {
    const {t} = this.props;
    toast.error(t(msg), {
      position: toast.POSITION.TOP_CENTER,
    });
  };

  render() {
    const {
      successCreate,
      redirectTo,
      waiting,
      title,
      start,
      finish,
      candidates,
      numGrades,
      isAdvancedOptionsOpen,
      electorEmails,
    } = this.state;
    const {t} = this.props;

    const grades = i18nGrades();
    const check = this.checkFields();

    if (successCreate) return <Redirect to={redirectTo} />;

    return (
        <Container>
          <ToastContainer />
          {waiting ? <Loader /> : ''}
          <form onSubmit={this.handleSubmit} autoComplete="off">
            <Row>
              <Col>
                <h3>{t('Start an election')}</h3>
              </Col>
            </Row>
            <hr />
            <Row className="mt-4">
              <Col xs="12">
                <Label for="title">{t('Question of the election')}</Label>
              </Col>
              <Col>
                <Input
                    placeholder={t('Write here the question of your election')}
                    tabIndex="1"
                    name="title"
                    id="title"
                    innerRef={this.focusInput}
                    autoFocus
                    value={title}
                    onChange={this.handleChangeTitle}
                    maxLength="250"
                />
              </Col>
              <Col xs="auto" className="align-self-center pl-0">
                <HelpButton>
                  {t(
                      'Write here your question or introduce simple your election (250 characters max.)',
                  )}
                  <br />
                  <u>{t('For example:')}</u>{' '}
                  <em>
                    {t(
                        'For the role of my representative, I judge this candidate...',
                    )}
                  </em>
                </HelpButton>
              </Col>
            </Row>
            <Row className="mt-4">
              <Col xs="12">
                <Label for="title">{t('Candidates/Proposals')}</Label>
              </Col>
              <Col xs="12">
                <SortableCandidatesContainer
                    items={candidates}
                    onSortEnd={this.onCandidatesSortEnd}
                    form={this}
                    t={t}
                    useDragHandle
                />
              </Col>
            </Row>
            <Row className="justify-content-between">
              <Col xs="12" sm="6" md="5" lg="4">
                <Button
                    color="secondary"
                    className="btn-block mt-2"
                    tabIndex={candidates.length + 2}
                    type="button"
                    onClick={event => this.addCandidate(event)}>
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  {t('Add a proposal')}
                </Button>
              </Col>
              <Col
                  xs="12"
                  sm="6"
                  md="12"
                  className="text-center text-sm-right text-md-left">
                <Button
                    color="link"
                    className="text-white mt-3 mb-1"
                    onClick={this.toggleAdvancedOptions}>
                  <FontAwesomeIcon icon={faCogs} className="mr-2" />
                  {t('Advanced options')}
                </Button>
              </Col>
            </Row>
            <Collapse isOpen={isAdvancedOptionsOpen}>
              <Card>
                <CardBody className="text-primary">
                  <Row>
                    <Col xs="12" md="3" lg="2">
                      <Label for="title">{t('Starting date:')}</Label>
                    </Col>
                    <Col xs="6" md="4" lg="3">
                      <input
                          className="form-control"
                          type="date"
                          value={dateToISO(start)}
                          onChange={e => {
                            this.setState({
                              start: new Date(
                                  timeMinusDate(start) +
                                  new Date(e.target.valueAsNumber).getTime(),
                              ),
                            });
                          }}
                      />
                    </Col>
                    <Col xs="6" md="5" lg="3">
                      <select
                          className="form-control"
                          value={start.getHours()}
                          onChange={e =>
                              this.setState({
                                start: new Date(
                                    dateMinusTime(start).getTime() +
                                    e.target.value * 3600000,
                                ),
                              })
                          }>
                        {displayClockOptions()}
                      </select>
                    </Col>
                  </Row>
                  <hr className="mt-2 mb-2" />
                  <Row>
                    <Col xs="12" md="3" lg="2">
                      <Label for="title">{t('Ending date:')}</Label>
                    </Col>
                    <Col xs="6" md="4" lg="3">
                      <input
                          className="form-control"
                          type="date"
                          value={dateToISO(finish)}
                          min={dateToISO(start)}
                          onChange={e => {
                            this.setState({
                              finish: new Date(
                                  timeMinusDate(finish) +
                                  new Date(e.target.valueAsNumber).getTime(),
                              ),
                            });
                          }}
                      />
                    </Col>
                    <Col xs="6" md="5" lg="3">
                      <select
                          className="form-control"
                          value={finish.getHours()}
                          onChange={e =>
                              this.setState({
                                finish: new Date(
                                    dateMinusTime(finish).getTime() +
                                    e.target.value * 3600000,
                                ),
                              })
                          }>
                        {displayClockOptions()}
                      </select>
                    </Col>
                  </Row>
                  <hr className="mt-2 mb-2" />
                  <Row>
                    <Col xs="12" md="3" lg="2">
                      <Label for="title">{t('Grades:')}</Label>
                    </Col>
                    <Col xs="10" sm="11" md="4" lg="3">
                      <select
                          className="form-control"
                          tabIndex={candidates.length + 3}
                          onChange={this.handleChangeNumGrades}
                          defaultValue="7">
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                      </select>
                    </Col>
                    <Col xs="auto" className="align-self-center pl-0 ">
                      <HelpButton>
                        {t(
                            'You can select here the number of grades for your election',
                        )}
                        <br />
                        <u>{t('For example:')}</u>{' '}
                        <em>
                          {' '}
                          {t('5 = Excellent, Very good, Good, Fair, Passable')}
                        </em>
                      </HelpButton>
                    </Col>
                    <Col
                        xs="12"
                        md="9"
                        lg="10"
                        className="offset-xs-0 offset-md-3 offset-lg-2">
                      {grades.map((mention, i) => {
                        return (
                            <span
                                key={i}
                                className="badge badge-light mr-2 mt-2 "
                                style={{
                                  backgroundColor: mention.color,
                                  color: '#fff',
                                  opacity: i < numGrades ? 1 : 0.3,
                                }}>
                          {mention.label}
                        </span>
                        );
                      })}
                    </Col>
                  </Row>
                  <hr className="mt-2 mb-2" />
                  <Row>
                    <Col xs="12" md="3" lg="2">
                      <Label for="title">{t('Participants:')}</Label>
                    </Col>
                    <Col xs="12" md="9" lg="10">
                      <ReactMultiEmail
                          placeholder={t("Add here participants' emails")}
                          emails={electorEmails}
                          onChange={_emails => {
                            this.setState({electorEmails: _emails});
                          }}
                          validateEmail={email => {
                            return isEmail(email); // return boolean
                          }}
                          getLabel={(email, index, removeEmail) => {
                            return (
                                <div data-tag key={index}>
                                  {email}
                                  <span
                                      data-tag-handle
                                      onClick={() => removeEmail(index)}>
                              ×
                            </span>
                          </div>
                        );
                      }}
                    />
                    <div>
                      <small className="text-muted">
                        {t(
                          "If you list voters' emails, only them will be able to access the election",
                        )}
                      </small>
                    </div>
                  </Col>
                </Row>
                <hr className="mt-2 mb-2" />
              </CardBody>
            </Card>
          </Collapse>
          <Row className="justify-content-end mt-2">
            <Col xs="12" md="3">
              {check.ok ? (
                <ButtonWithConfirm
                  className="btn btn-success float-right btn-block"
                  tabIndex={candidates.length + 4}>
                  <div key="button">
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    {t('Validate')}
                  </div>
                  <div key="modal-title">{t('Confirm your vote')}</div>
                  <div key="modal-body">
                    <div className="mt-1 mb-1">
                      <div className="text-white bg-primary p-1">
                        {t('Question of the election')}
                      </div>
                      <div className="p-1 pl-3">
                        <em>{title}</em>
                      </div>
                      <div className="text-white bg-primary p-1">
                        {t('Candidates/Proposals')}
                      </div>
                      <div className="p-1 pl-0">
                        <ul className="m-0 pl-4">
                          {candidates.map((candidate, i) => {
                            if (candidate.label !== '') {
                              return (
                                <li key={i} className="m-0">
                                  {candidate.label}
                                </li>
                              );
                            } else {
                              return <li key={i} className="d-none" />;
                            }
                          })}
                        </ul>
                      </div>
                      <div className="text-white bg-primary p-1 mt-1">
                        {t('Dates')}
                      </div>
                      <p className="p-1 pl-3">
                        {t('The election will take place from')}{' '}
                        <b>
                          {start.toLocaleDateString()}, {t('at')}{' '}
                          {start.toLocaleTimeString()}
                        </b>{' '}
                        {t('to')}{' '}
                        <b>
                          {finish.toLocaleDateString()}, {t('at')}{' '}
                          {finish.toLocaleTimeString()}
                        </b>
                      </p>
                      <div className="text-white bg-primary p-1">
                        {t('Grades')}
                      </div>
                      <div className="p-1 pl-3">
                        {grades.map((mention, i) => {
                          return i < numGrades ? (
                            <span
                              key={i}
                              className="badge badge-light mr-2 mt-2"
                              style={{
                                backgroundColor: mention.color,
                                color: '#fff',
                              }}>
                              {mention.label}
                            </span>
                              ) : (
                                  <span key={i} />
                              );
                            })}
                          </div>
                          <div className="text-white bg-primary p-1 mt-1">
                            {t("Voters' list")}
                          </div>
                          <div className="p-1 pl-3">
                            {electorEmails.length > 0 ? (
                                electorEmails.join(', ')
                            ) : (
                                <p>
                                  {t('The form contains no address.')}
                                  <br />
                                  <em>
                                    {t(
                                        'The election will be opened to anyone with the link',
                                    )}
                                  </em>
                                </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div key="modal-confirm" onClick={this.handleSubmit}>
                        {t('Start the election')}
                      </div>
                      <div key="modal-cancel">{t('Cancel')}</div>
                    </ButtonWithConfirm>
                ) : (
                    <Button
                        type="button"
                        className="btn btn-dark float-right btn-block"
                        onClick={this.handleSendWithoutCandidate}>
                      <FontAwesomeIcon icon={faCheck} className="mr-2" />
                      {t('Confirm')}
                    </Button>
                )}
              </Col>
            </Row>
          </form>
        </Container>
    );
  }
}
export default withTranslation()(withRouter(CreateElection));
