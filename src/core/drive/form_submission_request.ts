import { FetchRequest, FetchRequestHeaders } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { dispatch } from "../../util"
import { StreamMessage } from "../streams/stream_message"
import { FormSubmission } from "./form_submission"

export interface FormSubmissionRequestDelegate {
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
}

export type FormSubmissionResult
  = { success: boolean, fetchResponse: FetchResponse }
  | { success: false, error: Error }

export enum FormSubmissionState {
  initialized,
    requesting,
    waiting,
    receiving,
    stopping,
    stopped,
}

export class FormSubmissionRequest implements FormSubmission {
  readonly delegate: FormSubmissionRequestDelegate
  readonly formSubmission: FormSubmission
  readonly mustRedirect: boolean
  readonly fetchRequest: FetchRequest
  state = FormSubmissionState.initialized
  result?: FormSubmissionResult

  constructor(delegate: FormSubmissionRequestDelegate, formSubmission: FormSubmission, mustRedirect = false) {
    this.delegate = delegate
    this.formSubmission = formSubmission
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement)
    this.mustRedirect = mustRedirect
  }

  get method() {
    return this.formSubmission.method
  }

  get location() {
    return this.formSubmission.location
  }

  get body() {
    return this.formSubmission.body
  }

  get formElement() {
    return this.formSubmission.formElement
  }

  get submitter() {
    return this.formSubmission.submitter
  }

  get formData() {
    return this.formSubmission.formData
  }

  get action() {
    return this.formSubmission.action
  }

  get enctype() {
    return this.formSubmission.enctype
  }

  get isIdempotent() {
    return this.fetchRequest.isIdempotent
  }

  // The submission process

  async start() {
    const { initialized, requesting } = FormSubmissionState
    if (this.state == initialized) {
      this.state = requesting
      return this.fetchRequest.perform()
    }
  }

  stop() {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  // Fetch request delegate

  prepareHeadersForRequest(headers: FetchRequestHeaders, request: FetchRequest) {
    if (!request.isIdempotent) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token")
      if (token) {
        headers["X-CSRF-Token"] = token
      }
      headers["Accept"] = [ StreamMessage.contentType, headers["Accept"] ].join(", ")
    }
  }

  requestStarted(request: FetchRequest) {
    this.state = FormSubmissionState.waiting
    dispatch("turbo:submit-start", { target: this.formElement, detail: { formSubmission: this } })
    this.delegate.formSubmissionStarted(this.formSubmission)
  }

  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: response.succeeded, fetchResponse: response }
  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this.formSubmission, response)
    } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this.formSubmission, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = { success: true, fetchResponse: response }
      this.delegate.formSubmissionSucceededWithResponse(this.formSubmission, response)
    }
  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: false, fetchResponse: response }
    this.delegate.formSubmissionFailedWithResponse(this.formSubmission, response)
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this.formSubmission, error)
  }

  requestFinished(request: FetchRequest) {
    this.state = FormSubmissionState.stopped
    dispatch("turbo:submit-end", { target: this.formElement, detail: { formSubmission: this, ...this.result }})
    this.delegate.formSubmissionFinished(this.formSubmission)
  }

  requestMustRedirect(request: FetchRequest) {
    return !request.isIdempotent && this.mustRedirect
  }
}

function getCookieValue(cookieName: string | null) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : []
    const cookie = cookies.find((cookie) => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=")
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function getMetaContent(name: string) {
  const element: HTMLMetaElement | null = document.querySelector(`meta[name="${name}"]`)
  return element && element.content
}

function responseSucceededWithoutRedirect(response: FetchResponse) {
  return response.statusCode == 200 && !response.redirected
}
