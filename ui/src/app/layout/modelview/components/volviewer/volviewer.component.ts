import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

import 'vtk.js/Sources/favicon';

// TODO: VTK.JS has no typescript bindings - add your own
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';

@Component({
  selector: 'app-volviewer',
  templateUrl: './volviewer.component.html',
  styleUrls: ['./volviewer.component.scss']
})
export class VolviewerComponent implements OnInit, AfterViewInit {
    @ViewChild('volViewerControlDiv') viewerDivElem: ElementRef;
    public fullScreen;
    public imageActorI;
    public imageActorJ;
    public imageActorK;
    public renderWindow;
    public fullScreenRenderWindow;

    updateColorWindow(e, imageActorI, imageActorJ, imageActorK, renderWindow) {
      const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorWindow')).value
      );
      imageActorI.getProperty().setColorWindow(colorLevel);
      imageActorJ.getProperty().setColorWindow(colorLevel);
      imageActorK.getProperty().setColorWindow(colorLevel);
      renderWindow.render();
    }

    updateColorLevel(e, imageActorI, imageActorJ, imageActorK, renderWindow) {
      const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorLevel')).value
      );
      imageActorI.getProperty().setColorLevel(colorLevel);
      imageActorJ.getProperty().setColorLevel(colorLevel);
      imageActorK.getProperty().setColorLevel(colorLevel);
      renderWindow.render();
  }

  constructor() {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
      const local = this;
      this.fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        background: [0, 0, 0],
      });
      this.renderWindow = this.fullScreenRenderWindow.getRenderWindow();
      const renderer = this.fullScreenRenderWindow.getRenderer();
      this.fullScreenRenderWindow.addController(this.viewerDivElem.nativeElement);

      this.imageActorI = vtkImageSlice.newInstance();
      this.imageActorJ = vtkImageSlice.newInstance();
      this.imageActorK = vtkImageSlice.newInstance();

      renderer.addActor(this.imageActorK);
      renderer.addActor(this.imageActorJ);
      renderer.addActor(this.imageActorI);

      const reader = vtkHttpDataSetReader.newInstance({
        fetchGzip: true,
      });
      reader
        .setUrl('assets', { loadData: true })
        .then(() => {
          const data = reader.getOutputData();
          const dataRange = data
            .getPointData()
            .getScalars()
            .getRange();
          const extent = data.getExtent();

          const imageMapperK = vtkImageMapper.newInstance();
          imageMapperK.setInputData(data);
          imageMapperK.setKSlice(30);
          local.imageActorK.setMapper(imageMapperK);

          const imageMapperJ = vtkImageMapper.newInstance();
          imageMapperJ.setInputData(data);
          imageMapperJ.setJSlice(30);
          local.imageActorJ.setMapper(imageMapperJ);

          const imageMapperI = vtkImageMapper.newInstance();
          imageMapperI.setInputData(data);
          imageMapperI.setISlice(30);
          local.imageActorI.setMapper(imageMapperI);

          renderer.resetCamera();
          renderer.resetCameraClippingRange();
          local.renderWindow.render();

          ['.sliceI', '.sliceJ', '.sliceK'].forEach((selector, idx) => {
            const el = document.querySelector(selector);
            el.setAttribute('min', extent[idx * 2 + 0]);
            el.setAttribute('max', extent[idx * 2 + 1]);
            el.setAttribute('value', '30');
          });

          ['.colorLevel', '.colorWindow'].forEach((selector) => {
            document.querySelector(selector).setAttribute('max', dataRange[1]);
            document.querySelector(selector).setAttribute('value', dataRange[1]);
          });
          const avRange = (dataRange[0] + dataRange[1]) / 2;
          document
            .querySelector('.colorLevel')
            .setAttribute('value', avRange.toString() );
          local.updateColorLevel(null, local.imageActorI, local.imageActorJ, local.imageActorK, local.renderWindow);
          local.updateColorWindow(null, local.imageActorI, local.imageActorJ, local.imageActorK, local.renderWindow);
        });

      document.querySelector('.sliceI').addEventListener('input', (e: Event) => {
        local.imageActorI.getMapper().setISlice(Number((<HTMLInputElement>e.target).value));
        local.renderWindow.render();
      });

      document.querySelector('.sliceJ').addEventListener('input', (e) => {
        local.imageActorJ.getMapper().setJSlice(Number((<HTMLInputElement>e.target).value));
        local.renderWindow.render();
      });

      document.querySelector('.sliceK').addEventListener('input', (e) => {
        local.imageActorK.getMapper().setKSlice(Number((<HTMLInputElement>e.target).value));
        local.renderWindow.render();
      });

      document.querySelector('.colorLevel').addEventListener('input', function(e) {
          local.updateColorLevel(e, local.imageActorI, local.imageActorJ, local.imageActorK, local.renderWindow);
      });
      document.querySelector('.colorWindow').addEventListener('input', function(e) {
          local.updateColorWindow(e, local.imageActorI, local.imageActorJ, local.imageActorK, local.renderWindow);
      });
  }
}
