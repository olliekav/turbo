import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "../../elements/frame_element"
import { LinkClickObserver, LinkClickObserverDelegate } from "../../observers/link_click_observer"

export class FrameRedirector implements LinkClickObserverDelegate, FormInterceptorDelegate {
  readonly element: Element
  readonly linkClickObserver: LinkClickObserver
  readonly formInterceptor: FormInterceptor

  constructor(element: Element) {
    this.element = element
    this.linkClickObserver = new LinkClickObserver(this, element)
    this.formInterceptor = new FormInterceptor(this, element)
  }

  start() {
    this.linkClickObserver.start()
    this.formInterceptor.start()
  }

  stop() {
    this.linkClickObserver.stop()
    this.formInterceptor.stop()
  }

  willFollowLinkToLocation(element: Element, url: URL) {
    return element.closest("turbo-frame") == null && this.shouldRedirect(element)
  }

  followedLinkToLocation(element: Element, url: URL) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.setAttribute("reloadable", "")
      frame.src = url.href
    }
  }

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return this.shouldRedirect(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.removeAttribute("reloadable")
      frame.delegate.formSubmissionIntercepted(element, submitter)
    }
  }

  private shouldRedirect(element: Element, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    return frame ? frame != element.closest("turbo-frame") : false
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame")
    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    }
  }
}
